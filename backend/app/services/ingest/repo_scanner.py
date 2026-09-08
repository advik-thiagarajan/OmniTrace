import os
import time
from pathlib import Path
from typing import Dict, List, Optional, Set
from backend.app.core.logging import logger
from backend.app.models.schemas import (
    EdgeType,
    GraphEdge,
    GraphNode,
    NodeType,
    ParsedFile,
    RepoIngestRequest,
    RepoIngestResponse,
)
from backend.app.services.graph.graph_service import graph_service
from backend.app.services.parser.tree_sitter_engine import parser_engine


class RepoScanner:
    """Scans repositories, parses files via Tree-Sitter, and constructs the dependency knowledge graph."""

    def __init__(self):
        self.parser = parser_engine
        self.graph = graph_service

    def should_ignore_dir(self, dir_name: str, exclude_patterns: List[str]) -> bool:
        if dir_name.startswith("."):
            return True
        for pattern in exclude_patterns:
            if pattern in dir_name:
                return True
        return False

    def should_include_file(self, file_path: str, include_patterns: List[str], exclude_patterns: List[str]) -> bool:
        path_str = file_path.replace("\\", "/")
        for exc in exclude_patterns:
            if f"/{exc}/" in path_str or path_str.startswith(f"{exc}/") or exc in path_str.split("/"):
                return False

        ext = Path(file_path).suffix.lower()
        valid_exts = {".py", ".ts", ".tsx", ".js", ".jsx"}
        return ext in valid_exts

    async def scan_and_ingest(self, request: RepoIngestRequest) -> RepoIngestResponse:
        start_time = time.time()
        abs_repo_path = os.path.abspath(request.repo_path)

        if not os.path.exists(abs_repo_path):
            raise ValueError(f"Repository path does not exist: {abs_repo_path}")

        repo_name = request.repo_name or os.path.basename(abs_repo_path) or "OmniTrace-Workspace"
        self.graph.memory.repo_name = repo_name
        await self.graph.clear_graph()

        parsed_files: List[ParsedFile] = []
        file_node_map: Dict[str, GraphNode] = {}
        func_node_map: Dict[str, GraphNode] = {}
        func_name_lookup: Dict[str, List[GraphNode]] = {}
        class_node_map: Dict[str, GraphNode] = {}

        # 1. Traverse and parse files
        for root, dirs, files in os.walk(abs_repo_path):
            # Filter directories in place
            dirs[:] = [d for d in dirs if not self.should_ignore_dir(d, request.exclude_patterns)]

            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, abs_repo_path).replace("\\", "/")

                if self.should_include_file(rel_path, request.include_patterns, request.exclude_patterns):
                    parsed = self.parser.parse_file(full_path, abs_repo_path)
                    parsed_files.append(parsed)

        logger.info(f"Parsed {len(parsed_files)} source files in {repo_name}")

        # 2. Create File Nodes
        for pf in parsed_files:
            file_node_id = f"file:{pf.relative_path}"
            file_node = GraphNode(
                id=file_node_id,
                label=os.path.basename(pf.relative_path),
                name=pf.relative_path,
                type=NodeType.FILE,
                file_path=pf.relative_path,
                language=pf.language.value,
                complexity=max(1, len(pf.functions) + len(pf.classes)),
                properties={
                    "total_lines": pf.total_lines,
                    "size_bytes": pf.size_bytes,
                    "syntax_valid": pf.syntax_valid,
                },
            )
            await self.graph.add_node(file_node)
            file_node_map[pf.relative_path] = file_node

            # Create Class Nodes & CONTAINS Edges
            for cls in pf.classes:
                cls_node_id = f"class:{cls.qualified_name}"
                cls_node = GraphNode(
                    id=cls_node_id,
                    label=cls.name,
                    name=cls.qualified_name,
                    type=NodeType.CLASS,
                    file_path=pf.relative_path,
                    language=pf.language.value,
                    complexity=max(1, len(cls.methods)),
                    properties={
                        "base_classes": cls.base_classes,
                        "docstring": cls.docstring,
                        "start_line": cls.location.start_line,
                        "end_line": cls.location.end_line,
                    },
                )
                await self.graph.add_node(cls_node)
                class_node_map[cls.name] = cls_node

                # Edge File -> Class (CONTAINS)
                await self.graph.add_edge(
                    GraphEdge(
                        id=f"edge:{file_node_id}->{cls_node_id}",
                        source=file_node_id,
                        target=cls_node_id,
                        type=EdgeType.CONTAINS,
                        weight=1.0,
                    )
                )

            # Create Function Nodes & CONTAINS Edges
            for fn in pf.functions:
                fn_node_id = f"fn:{fn.qualified_name}"
                fn_node = GraphNode(
                    id=fn_node_id,
                    label=fn.name,
                    name=fn.qualified_name,
                    type=NodeType.FUNCTION,
                    file_path=pf.relative_path,
                    language=pf.language.value,
                    complexity=fn.cyclomatic_complexity,
                    properties={
                        "parameters": fn.parameters,
                        "is_async": fn.is_async,
                        "is_method": fn.is_method,
                        "parent_class": fn.parent_class,
                        "docstring": fn.docstring,
                        "start_line": fn.location.start_line,
                        "end_line": fn.location.end_line,
                        "calls_count": len(fn.calls),
                    },
                )
                await self.graph.add_node(fn_node)
                func_node_map[fn.qualified_name] = fn_node
                func_name_lookup.setdefault(fn.name, []).append(fn_node)

                # Edge parent (Class or File) -> Function (CONTAINS)
                if fn.parent_class and fn.parent_class in class_node_map:
                    parent_id = class_node_map[fn.parent_class].id
                else:
                    parent_id = file_node_id

                await self.graph.add_edge(
                    GraphEdge(
                        id=f"edge:{parent_id}->{fn_node_id}",
                        source=parent_id,
                        target=fn_node_id,
                        type=EdgeType.CONTAINS,
                        weight=1.0,
                    )
                )

        # 3. Create Import Edges (File -> File)
        for pf in parsed_files:
            file_node_id = f"file:{pf.relative_path}"
            for imp in pf.imports:
                target_file_rel = self._resolve_import_path(pf.relative_path, imp.module_name, file_node_map)
                if target_file_rel and target_file_rel in file_node_map:
                    target_id = file_node_map[target_file_rel].id
                    if file_node_id != target_id:
                        await self.graph.add_edge(
                            GraphEdge(
                                id=f"import:{file_node_id}->{target_id}",
                                source=file_node_id,
                                target=target_id,
                                type=EdgeType.IMPORTS,
                                weight=1.5,
                                properties={"module": imp.module_name, "names": imp.imported_names},
                            )
                        )

        # 4. Create Function Call Edges (CALLS)
        for pf in parsed_files:
            for call in pf.calls:
                caller_qual = call.caller_qualified_name
                # Find caller node
                caller_node = func_node_map.get(caller_qual)
                if not caller_node:
                    # check if caller is file module
                    caller_id = f"file:{pf.relative_path}"
                else:
                    caller_id = caller_node.id

                # Resolve callee node
                callees = func_name_lookup.get(call.callee_name, [])
                if callees:
                    # Prefer callee in the same file or imported files
                    target_callee = callees[0]
                    for candidate in callees:
                        if candidate.file_path == pf.relative_path:
                            target_callee = candidate
                            break

                    if caller_id != target_callee.id:
                        await self.graph.add_edge(
                            GraphEdge(
                                id=f"call:{caller_id}->{target_callee.id}",
                                source=caller_id,
                                target=target_callee.id,
                                type=EdgeType.CALLS,
                                weight=2.0,
                                properties={"args_count": call.arguments_count},
                            )
                        )

        # 5. Create Class Inheritance Edges (INHERITS)
        for pf in parsed_files:
            for cls in pf.classes:
                cls_node_id = f"class:{cls.qualified_name}"
                for base in cls.base_classes:
                    if base in class_node_map:
                        base_id = class_node_map[base].id
                        await self.graph.add_edge(
                            GraphEdge(
                                id=f"inherits:{cls_node_id}->{base_id}",
                                source=cls_node_id,
                                target=base_id,
                                type=EdgeType.INHERITS,
                                weight=1.8,
                            )
                        )

        # Compute initial 3D constellation layout
        self.graph.memory.compute_3d_layout()

        duration = (time.time() - start_time) * 1000
        total_fn = sum(len(pf.functions) for pf in parsed_files)
        total_cls = sum(len(pf.classes) for pf in parsed_files)
        total_edges = len(self.graph.memory.edges)

        logger.info(
            f"Repository {repo_name} ingested in {duration:.1f}ms: "
            f"{len(parsed_files)} files, {total_fn} functions, {total_cls} classes, {total_edges} edges"
        )

        return RepoIngestResponse(
            status="SUCCESS",
            repo_name=repo_name,
            repo_path=abs_repo_path,
            files_scanned=len(parsed_files),
            functions_extracted=total_fn,
            classes_extracted=total_cls,
            edges_created=total_edges,
            duration_ms=round(duration, 2),
            message=f"Successfully ingested and indexed {repo_name}",
        )

    def _resolve_import_path(
        self, current_file: str, module_name: str, file_map: Dict[str, GraphNode]
    ) -> Optional[str]:
        if not module_name:
            return None

        # Clean module name
        norm_mod = module_name.replace(".", "/").lstrip("./")

        # 1. Direct match with common extensions
        for ext in ["", ".py", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js", "/__init__.py"]:
            candidate = f"{norm_mod}{ext}"
            if candidate in file_map:
                return candidate

        # 2. Relative resolution from current directory
        curr_dir = os.path.dirname(current_file).replace("\\", "/")
        if curr_dir:
            for ext in ["", ".py", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.js", "/__init__.py"]:
                candidate = f"{curr_dir}/{norm_mod}{ext}"
                norm_cand = os.path.normpath(candidate).replace("\\", "/")
                if norm_cand in file_map:
                    return norm_cand

        # 3. Suffix match
        for f_path in file_map.keys():
            if f_path.endswith(f"{norm_mod}.py") or f_path.endswith(f"{norm_mod}.ts") or f_path.endswith(f"{norm_mod}.js"):
                return f_path

        return None


repo_scanner = RepoScanner()
