import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import tree_sitter
from tree_sitter import Language as TSLanguage, Parser, Node

try:
    import tree_sitter_python
    PY_LANGUAGE = TSLanguage(tree_sitter_python.language())
except Exception as e:
    PY_LANGUAGE = None

try:
    import tree_sitter_typescript
    TS_LANGUAGE = TSLanguage(tree_sitter_typescript.language_typescript())
    TSX_LANGUAGE = TSLanguage(tree_sitter_typescript.language_tsx())
except Exception as e:
    TS_LANGUAGE = None
    TSX_LANGUAGE = None

from backend.app.core.logging import logger
from backend.app.models.schemas import (
    CallSymbol,
    ClassSymbol,
    FunctionSymbol,
    ImportSymbol,
    Language,
    ParsedFile,
    SymbolLocation,
)


class TreeSitterParser:
    """Enterprise-grade AST parser powered by Tree-sitter for Python and TypeScript/JavaScript."""

    def __init__(self):
        self.parsers: Dict[str, Parser] = {}
        if PY_LANGUAGE:
            self.parsers["python"] = Parser(PY_LANGUAGE)
        if TS_LANGUAGE:
            self.parsers["typescript"] = Parser(TS_LANGUAGE)
        if TSX_LANGUAGE:
            self.parsers["tsx"] = Parser(TSX_LANGUAGE)

    def detect_language(self, file_path: str) -> Language:
        ext = Path(file_path).suffix.lower()
        if ext in [".py", ".pyw"]:
            return Language.PYTHON
        elif ext in [".ts"]:
            return Language.TYPESCRIPT
        elif ext in [".tsx", ".jsx", ".js", ".mjs", ".cjs"]:
            return Language.TYPESCRIPT  # mapped to TS/JS parser
        return Language.UNKNOWN

    def _get_parser_for_language(self, lang: Language, ext: str) -> Optional[Parser]:
        if lang == Language.PYTHON:
            return self.parsers.get("python")
        elif lang == Language.TYPESCRIPT:
            if ext in [".tsx", ".jsx"]:
                return self.parsers.get("tsx") or self.parsers.get("typescript")
            return self.parsers.get("typescript")
        return None

    def parse_source_code(
        self, code: str, file_path: str, relative_path: Optional[str] = None
    ) -> ParsedFile:
        rel_path = relative_path or file_path
        lang = self.detect_language(file_path)
        ext = Path(file_path).suffix.lower()
        parser = self._get_parser_for_language(lang, ext)

        lines = code.splitlines()
        total_lines = len(lines)
        size_bytes = len(code.encode("utf-8"))

        if not parser or lang == Language.UNKNOWN:
            return ParsedFile(
                file_path=file_path,
                relative_path=rel_path,
                language=lang,
                size_bytes=size_bytes,
                total_lines=total_lines,
                syntax_valid=True,
                parse_errors=[],
            )

        code_bytes = code.encode("utf-8")
        try:
            tree = parser.parse(code_bytes)
            root_node = tree.root_node
        except Exception as e:
            logger.error(f"Tree-sitter parse error in {file_path}: {e}")
            return ParsedFile(
                file_path=file_path,
                relative_path=rel_path,
                language=lang,
                size_bytes=size_bytes,
                total_lines=total_lines,
                syntax_valid=False,
                parse_errors=[str(e)],
            )

        functions: List[FunctionSymbol] = []
        classes: List[ClassSymbol] = []
        imports: List[ImportSymbol] = []
        calls: List[CallSymbol] = []

        if lang == Language.PYTHON:
            self._traverse_python(
                root_node, code_bytes, rel_path, functions, classes, imports, calls
            )
        else:
            self._traverse_typescript(
                root_node, code_bytes, rel_path, functions, classes, imports, calls
            )

        return ParsedFile(
            file_path=file_path,
            relative_path=rel_path,
            language=lang,
            size_bytes=size_bytes,
            total_lines=total_lines,
            functions=functions,
            classes=classes,
            imports=imports,
            calls=calls,
            syntax_valid=not root_node.has_error,
            parse_errors=["AST contains syntax errors"] if root_node.has_error else [],
        )

    def parse_file(self, file_path: str, repo_root: Optional[str] = None) -> ParsedFile:
        abs_path = os.path.abspath(file_path)
        rel_path = (
            os.path.relpath(abs_path, repo_root).replace("\\", "/")
            if repo_root
            else os.path.basename(abs_path)
        )
        try:
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return self.parse_source_code(content, abs_path, rel_path)
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            return ParsedFile(
                file_path=abs_path,
                relative_path=rel_path,
                language=self.detect_language(abs_path),
                size_bytes=0,
                total_lines=0,
                syntax_valid=False,
                parse_errors=[f"File read failed: {str(e)}"],
            )

    # --- Python AST Traversal ---
    def _traverse_python(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        functions: List[FunctionSymbol],
        classes: List[ClassSymbol],
        imports: List[ImportSymbol],
        calls: List[CallSymbol],
        current_class: Optional[str] = None,
        scope_prefix: str = "",
    ):
        # 1. Function / Method Definition
        if node.type in ("function_definition", "async_function_definition"):
            fn_name_node = node.child_by_field_name("name")
            fn_name = self._node_text(fn_name_node, source) if fn_name_node else "anonymous"
            qual_name = f"{scope_prefix}{fn_name}" if not current_class else f"{scope_prefix}{current_class}.{fn_name}"

            # Parameters
            params_node = node.child_by_field_name("parameters")
            params = self._extract_python_params(params_node, source)

            # Docstring
            docstring = self._extract_python_docstring(node, source)

            # Complexity
            complexity = self._calculate_python_complexity(node)

            # Internal calls within function body
            fn_calls: List[str] = []
            self._extract_python_calls_in_scope(node, source, file_path, qual_name, calls, fn_calls)

            fn_symbol = FunctionSymbol(
                name=fn_name,
                qualified_name=f"{file_path}::{qual_name}",
                file_path=file_path,
                location=self._node_location(node),
                parameters=params,
                docstring=docstring,
                is_async=(node.type == "async_function_definition"),
                is_method=(current_class is not None),
                parent_class=current_class,
                cyclomatic_complexity=complexity,
                calls=fn_calls,
            )
            functions.append(fn_symbol)
            return  # Inner scopes handled inside _extract_python_calls_in_scope and nested traversal if needed

        # 2. Class Definition
        elif node.type == "class_definition":
            cls_name_node = node.child_by_field_name("name")
            cls_name = self._node_text(cls_name_node, source) if cls_name_node else "AnonymousClass"
            qual_cls_name = f"{scope_prefix}{cls_name}"

            # Superclasses
            superclasses_node = node.child_by_field_name("superclasses")
            base_classes = []
            if superclasses_node:
                for child in superclasses_node.children:
                    if child.type in ("identifier", "attribute"):
                        base_classes.append(self._node_text(child, source))

            docstring = self._extract_python_docstring(node, source)
            class_methods: List[FunctionSymbol] = []

            # Traverse class body
            body_node = node.child_by_field_name("body")
            if body_node:
                for child in body_node.children:
                    if child.type in ("function_definition", "async_function_definition"):
                        m_name_node = child.child_by_field_name("name")
                        m_name = self._node_text(m_name_node, source) if m_name_node else "method"
                        m_qual_name = f"{qual_cls_name}.{m_name}"
                        m_params = self._extract_python_params(child.child_by_field_name("parameters"), source)
                        m_doc = self._extract_python_docstring(child, source)
                        m_complexity = self._calculate_python_complexity(child)
                        m_calls: List[str] = []
                        self._extract_python_calls_in_scope(child, source, file_path, m_qual_name, calls, m_calls)

                        m_symbol = FunctionSymbol(
                            name=m_name,
                            qualified_name=f"{file_path}::{m_qual_name}",
                            file_path=file_path,
                            location=self._node_location(child),
                            parameters=m_params,
                            docstring=m_doc,
                            is_async=(child.type == "async_function_definition"),
                            is_method=True,
                            parent_class=cls_name,
                            cyclomatic_complexity=m_complexity,
                            calls=m_calls,
                        )
                        class_methods.append(m_symbol)
                        functions.append(m_symbol)

            cls_symbol = ClassSymbol(
                name=cls_name,
                qualified_name=f"{file_path}::{qual_cls_name}",
                file_path=file_path,
                location=self._node_location(node),
                base_classes=base_classes,
                methods=class_methods,
                docstring=docstring,
            )
            classes.append(cls_symbol)
            return

        # 3. Imports
        elif node.type == "import_statement":
            # e.g., import os, sys as system
            for child in node.children:
                if child.type == "dotted_name":
                    imports.append(
                        ImportSymbol(
                            module_name=self._node_text(child, source),
                            imported_names=[],
                            file_path=file_path,
                            location=self._node_location(node),
                        )
                    )
                elif child.type == "aliased_import":
                    name_n = child.child_by_field_name("name")
                    alias_n = child.child_by_field_name("alias")
                    imports.append(
                        ImportSymbol(
                            module_name=self._node_text(name_n, source) if name_n else "",
                            alias=self._node_text(alias_n, source) if alias_n else None,
                            file_path=file_path,
                            location=self._node_location(node),
                        )
                    )

        elif node.type == "import_from_statement":
            # e.g., from ..module import a, b as c
            module_name = ""
            is_relative = False
            for child in node.children:
                if child.type == "dotted_name" or child.type == "relative_import":
                    module_name = self._node_text(child, source)
                    if module_name.startswith("."):
                        is_relative = True
                    break

            imported_names = []
            for child in node.children:
                if child.type == "dotted_name" and child != node.children[1]:
                    imported_names.append(self._node_text(child, source))
                elif child.type == "aliased_import":
                    n = child.child_by_field_name("name")
                    if n:
                        imported_names.append(self._node_text(n, source))
                elif child.type == "identifier" and child != node.child_by_field_name("module_name"):
                    text = self._node_text(child, source)
                    if text not in ("from", "import"):
                        imported_names.append(text)

            imports.append(
                ImportSymbol(
                    module_name=module_name,
                    imported_names=imported_names,
                    is_relative=is_relative,
                    file_path=file_path,
                    location=self._node_location(node),
                )
            )

        # 4. Top-level call expressions
        elif node.type == "call":
            callee_name = self._extract_callee_name(node, source)
            if callee_name:
                calls.append(
                    CallSymbol(
                        caller_qualified_name=f"{file_path}::<module>",
                        callee_name=callee_name,
                        file_path=file_path,
                        location=self._node_location(node),
                        arguments_count=len(
                            node.child_by_field_name("arguments").children
                        )
                        if node.child_by_field_name("arguments")
                        else 0,
                    )
                )

        # Recurse child nodes
        for child in node.children:
            self._traverse_python(
                child, source, file_path, functions, classes, imports, calls, current_class, scope_prefix
            )

    def _extract_python_calls_in_scope(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        caller_qual_name: str,
        all_calls: List[CallSymbol],
        fn_calls: List[str],
    ):
        for child in node.children:
            if child.type == "call":
                callee_name = self._extract_callee_name(child, source)
                if callee_name:
                    fn_calls.append(callee_name)
                    args_node = child.child_by_field_name("arguments")
                    arg_count = len(args_node.children) if args_node else 0
                    all_calls.append(
                        CallSymbol(
                            caller_qualified_name=f"{file_path}::{caller_qual_name}",
                            callee_name=callee_name,
                            file_path=file_path,
                            location=self._node_location(child),
                            arguments_count=arg_count,
                        )
                    )
            # Recurse children within this function scope
            if child.type not in ("function_definition", "async_function_definition", "class_definition"):
                self._extract_python_calls_in_scope(child, source, file_path, caller_qual_name, all_calls, fn_calls)

    # --- TypeScript / JavaScript AST Traversal ---
    def _traverse_typescript(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        functions: List[FunctionSymbol],
        classes: List[ClassSymbol],
        imports: List[ImportSymbol],
        calls: List[CallSymbol],
        current_class: Optional[str] = None,
        scope_prefix: str = "",
    ):
        # 1. Function Declarations & Arrow Functions
        if node.type in ("function_declaration", "generator_function_declaration"):
            name_node = node.child_by_field_name("name")
            fn_name = self._node_text(name_node, source) if name_node else "anonymous"
            qual_name = f"{scope_prefix}{fn_name}"

            params_node = node.child_by_field_name("parameters")
            params = self._extract_ts_params(params_node, source)
            complexity = self._calculate_ts_complexity(node)

            fn_calls: List[str] = []
            self._extract_ts_calls_in_scope(node, source, file_path, qual_name, calls, fn_calls)

            is_async = any(self._node_text(c, source) == "async" for c in node.children)

            fn_symbol = FunctionSymbol(
                name=fn_name,
                qualified_name=f"{file_path}::{qual_name}",
                file_path=file_path,
                location=self._node_location(node),
                parameters=params,
                docstring=None,
                is_async=is_async,
                is_method=False,
                cyclomatic_complexity=complexity,
                calls=fn_calls,
            )
            functions.append(fn_symbol)
            return

        elif node.type == "lexical_declaration":
            # Variable declarations: const foo = () => {} or const bar = function() {}
            for declarator in node.children:
                if declarator.type == "variable_declarator":
                    name_n = declarator.child_by_field_name("name")
                    value_n = declarator.child_by_field_name("value")
                    if value_n and value_n.type in ("arrow_function", "function_expression"):
                        fn_name = self._node_text(name_n, source) if name_n else "anonymous"
                        qual_name = f"{scope_prefix}{fn_name}"
                        params_n = value_n.child_by_field_name("parameters")
                        params = self._extract_ts_params(params_n, source)
                        complexity = self._calculate_ts_complexity(value_n)
                        fn_calls = []
                        self._extract_ts_calls_in_scope(value_n, source, file_path, qual_name, calls, fn_calls)
                        is_async = any(self._node_text(c, source) == "async" for c in value_n.children)

                        fn_symbol = FunctionSymbol(
                            name=fn_name,
                            qualified_name=f"{file_path}::{qual_name}",
                            file_path=file_path,
                            location=self._node_location(declarator),
                            parameters=params,
                            is_async=is_async,
                            is_method=False,
                            cyclomatic_complexity=complexity,
                            calls=fn_calls,
                        )
                        functions.append(fn_symbol)

        # 2. Class Declaration
        elif node.type in ("class_declaration", "class"):
            name_node = node.child_by_field_name("name")
            cls_name = self._node_text(name_node, source) if name_node else "AnonymousClass"
            qual_cls_name = f"{scope_prefix}{cls_name}"

            # Heritage / extends
            base_classes = []
            heritage = node.child_by_field_name("heritage") or node.child_by_field_name("extends")
            if heritage:
                for c in heritage.children:
                    if c.type in ("identifier", "type_identifier"):
                        base_classes.append(self._node_text(c, source))

            class_methods: List[FunctionSymbol] = []
            body = node.child_by_field_name("body")
            if body:
                for child in body.children:
                    if child.type == "method_definition":
                        m_name_node = child.child_by_field_name("name")
                        m_name = self._node_text(m_name_node, source) if m_name_node else "method"
                        m_qual_name = f"{qual_cls_name}.{m_name}"
                        m_params = self._extract_ts_params(child.child_by_field_name("parameters"), source)
                        m_complexity = self._calculate_ts_complexity(child)
                        m_calls: List[str] = []
                        self._extract_ts_calls_in_scope(child, source, file_path, m_qual_name, calls, m_calls)
                        is_async = any(self._node_text(c, source) == "async" for c in child.children)

                        m_symbol = FunctionSymbol(
                            name=m_name,
                            qualified_name=f"{file_path}::{m_qual_name}",
                            file_path=file_path,
                            location=self._node_location(child),
                            parameters=m_params,
                            is_async=is_async,
                            is_method=True,
                            parent_class=cls_name,
                            cyclomatic_complexity=m_complexity,
                            calls=m_calls,
                        )
                        class_methods.append(m_symbol)
                        functions.append(m_symbol)

            cls_symbol = ClassSymbol(
                name=cls_name,
                qualified_name=f"{file_path}::{qual_cls_name}",
                file_path=file_path,
                location=self._node_location(node),
                base_classes=base_classes,
                methods=class_methods,
            )
            classes.append(cls_symbol)
            return

        # 3. Import Statements
        elif node.type == "import_statement":
            # e.g., import { a, b as c } from './module'
            source_node = node.child_by_field_name("source")
            mod_raw = self._node_text(source_node, source) if source_node else ""
            mod_name = mod_raw.strip("'\"`")

            imported_names = []
            for child in node.children:
                if child.type == "import_clause":
                    for sub in child.children:
                        if sub.type == "identifier":
                            imported_names.append(self._node_text(sub, source))
                        elif sub.type == "named_imports":
                            for specifier in sub.children:
                                if specifier.type == "import_specifier":
                                    n = specifier.child_by_field_name("name")
                                    if n:
                                        imported_names.append(self._node_text(n, source))

            imports.append(
                ImportSymbol(
                    module_name=mod_name,
                    imported_names=imported_names,
                    is_relative=mod_name.startswith("."),
                    file_path=file_path,
                    location=self._node_location(node),
                )
            )

        # 4. Top level calls
        elif node.type == "call_expression":
            callee_name = self._extract_ts_callee_name(node, source)
            if callee_name:
                calls.append(
                    CallSymbol(
                        caller_qualified_name=f"{file_path}::<module>",
                        callee_name=callee_name,
                        file_path=file_path,
                        location=self._node_location(node),
                        arguments_count=len(node.child_by_field_name("arguments").children)
                        if node.child_by_field_name("arguments")
                        else 0,
                    )
                )

        for child in node.children:
            self._traverse_typescript(
                child, source, file_path, functions, classes, imports, calls, current_class, scope_prefix
            )

    def _extract_ts_calls_in_scope(
        self,
        node: Node,
        source: bytes,
        file_path: str,
        caller_qual_name: str,
        all_calls: List[CallSymbol],
        fn_calls: List[str],
    ):
        for child in node.children:
            if child.type == "call_expression":
                callee_name = self._extract_ts_callee_name(child, source)
                if callee_name:
                    fn_calls.append(callee_name)
                    args = child.child_by_field_name("arguments")
                    arg_count = len(args.children) if args else 0
                    all_calls.append(
                        CallSymbol(
                            caller_qualified_name=f"{file_path}::{caller_qual_name}",
                            callee_name=callee_name,
                            file_path=file_path,
                            location=self._node_location(child),
                            arguments_count=arg_count,
                        )
                    )
            if child.type not in ("function_declaration", "class_declaration", "method_definition"):
                self._extract_ts_calls_in_scope(child, source, file_path, caller_qual_name, all_calls, fn_calls)

    # --- Helpers ---
    def _node_text(self, node: Optional[Node], source: bytes) -> str:
        if not node:
            return ""
        return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

    def _node_location(self, node: Node) -> SymbolLocation:
        return SymbolLocation(
            start_line=node.start_point[0] + 1,
            start_column=node.start_point[1],
            end_line=node.end_point[0] + 1,
            end_column=node.end_point[1],
        )

    def _extract_python_params(self, params_node: Optional[Node], source: bytes) -> List[str]:
        if not params_node:
            return []
        params = []
        for child in params_node.children:
            if child.type in ("identifier", "default_parameter", "typed_parameter", "typed_default_parameter"):
                p_text = self._node_text(child, source)
                if p_text and p_text not in ("(", ")", ","):
                    params.append(p_text.split(":")[0].split("=")[0].strip())
        return params

    def _extract_ts_params(self, params_node: Optional[Node], source: bytes) -> List[str]:
        if not params_node:
            return []
        params = []
        for child in params_node.children:
            if child.type in ("identifier", "required_parameter", "optional_parameter"):
                p_text = self._node_text(child, source)
                if p_text and p_text not in ("(", ")", ","):
                    params.append(p_text.split(":")[0].strip())
        return params

    def _extract_python_docstring(self, node: Node, source: bytes) -> Optional[str]:
        body = node.child_by_field_name("body")
        if body and len(body.children) > 0:
            first = body.children[0]
            if first.type == "expression_statement":
                for sub in first.children:
                    if sub.type == "string":
                        raw = self._node_text(sub, source)
                        return raw.strip('"""\'\'\'').strip()
        return None

    def _calculate_python_complexity(self, node: Node) -> int:
        complexity = 1
        branch_types = {
            "if_statement",
            "elif_clause",
            "for_statement",
            "while_statement",
            "except_clause",
            "boolean_operator",
            "with_statement",
            "conditional_expression",
        }

        def _count(n: Node):
            nonlocal complexity
            if n.type in branch_types:
                complexity += 1
            for child in n.children:
                _count(child)

        _count(node)
        return complexity

    def _calculate_ts_complexity(self, node: Node) -> int:
        complexity = 1
        branch_types = {
            "if_statement",
            "for_statement",
            "for_in_statement",
            "while_statement",
            "do_statement",
            "catch_clause",
            "ternary_expression",
            "binary_expression",
            "switch_case",
        }

        def _count(n: Node):
            nonlocal complexity
            if n.type in branch_types:
                complexity += 1
            for child in n.children:
                _count(child)

        _count(node)
        return complexity

    def _extract_callee_name(self, call_node: Node, source: bytes) -> Optional[str]:
        fn_node = call_node.child_by_field_name("function")
        if not fn_node:
            return None
        if fn_node.type == "identifier":
            return self._node_text(fn_node, source)
        elif fn_node.type == "attribute":
            attr = fn_node.child_by_field_name("attribute")
            return self._node_text(attr, source) if attr else self._node_text(fn_node, source)
        return self._node_text(fn_node, source)

    def _extract_ts_callee_name(self, call_node: Node, source: bytes) -> Optional[str]:
        fn_node = call_node.child_by_field_name("function")
        if not fn_node:
            return None
        if fn_node.type == "identifier":
            return self._node_text(fn_node, source)
        elif fn_node.type == "member_expression":
            prop = fn_node.child_by_field_name("property")
            return self._node_text(prop, source) if prop else self._node_text(fn_node, source)
        return self._node_text(fn_node, source)


parser_engine = TreeSitterParser()
