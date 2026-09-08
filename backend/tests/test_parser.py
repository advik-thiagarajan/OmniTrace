import pytest
from backend.app.services.parser.tree_sitter_engine import TreeSitterParser
from backend.app.models.schemas import Language


def test_python_parsing():
    parser = TreeSitterParser()
    py_code = """
import os
from typing import List, Optional

class UserManager:
    \"\"\"Manages user authentication and tokens.\"\"\"
    def __init__(self, db_url: str):
        self.db_url = db_url

    async def authenticate_user(self, username: str, password_hash: str) -> bool:
        if not username:
            return False
        token = self.generate_token(username)
        return True

    def generate_token(self, username: str) -> str:
        return "token_123"

def top_level_helper(x: int):
    return x * 2
"""
    result = parser.parse_source_code(py_code, "app/auth.py", "app/auth.py")

    assert result.syntax_valid is True
    assert result.language == Language.PYTHON
    assert len(result.classes) == 1
    assert result.classes[0].name == "UserManager"
    assert len(result.classes[0].methods) == 3
    assert len(result.functions) == 4  # 3 methods + 1 top_level_helper
    assert len(result.imports) >= 2

    # Check function names
    fn_names = [f.name for f in result.functions]
    assert "authenticate_user" in fn_names
    assert "generate_token" in fn_names
    assert "top_level_helper" in fn_names


def test_typescript_parsing():
    parser = TreeSitterParser()
    ts_code = """
import { useState, useEffect } from 'react';
import axios from 'axios';

export interface UserProps {
    id: string;
    name: string;
}

export class AuthService {
    login(token: string) {
        if (token.length > 0) {
            console.log("Logged in");
            return true;
        }
        return false;
    }
}

export const fetchProfile = async (userId: string) => {
    const res = await axios.get(`/users/${userId}`);
    return res.data;
};
"""
    result = parser.parse_source_code(ts_code, "src/auth.ts", "src/auth.ts")

    assert result.syntax_valid is True
    assert result.language == Language.TYPESCRIPT
    assert len(result.classes) == 1
    assert result.classes[0].name == "AuthService"
    assert len(result.imports) == 2

    fn_names = [f.name for f in result.functions]
    assert "login" in fn_names
    assert "fetchProfile" in fn_names
