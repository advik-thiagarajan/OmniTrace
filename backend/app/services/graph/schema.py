# Neo4j Cypher Schema Constraints and Indexes

CYPHER_CONSTRAINTS = [
    """
    CREATE CONSTRAINT file_path_unique IF NOT EXISTS
    FOR (f:File) REQUIRE f.path IS UNIQUE
    """,
    """
    CREATE CONSTRAINT function_qual_name_unique IF NOT EXISTS
    FOR (fn:Function) REQUIRE fn.qualified_name IS UNIQUE
    """,
    """
    CREATE CONSTRAINT class_qual_name_unique IF NOT EXISTS
    FOR (c:Class) REQUIRE c.qualified_name IS UNIQUE
    """,
    """
    CREATE CONSTRAINT repo_name_unique IF NOT EXISTS
    FOR (r:Repository) REQUIRE r.name IS UNIQUE
    """,
]

CYPHER_INDEXES = [
    """
    CREATE INDEX file_lang_index IF NOT EXISTS
    FOR (f:File) ON (f.language)
    """,
    """
    CREATE INDEX fn_name_index IF NOT EXISTS
    FOR (fn:Function) ON (fn.name)
    """,
    """
    CREATE INDEX class_name_index IF NOT EXISTS
    FOR (c:Class) ON (c.name)
    """,
]
