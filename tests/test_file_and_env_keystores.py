"""Tests for FileKeyStore and EnvKeyStore cross-platform BYOK credential stores."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from agrosage.credentials import EnvKeyStore, FileKeyStore, OsCredentialStoreUnavailable


class FileKeyStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.keys_dir = Path(self.temp_dir.name)
        self.store = FileKeyStore(self.keys_dir)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_get_or_create_persists_key(self):
        key1 = self.store.get_or_create_key("test-v1")
        self.assertEqual(len(key1), 32)
        key2 = self.store.get_key("test-v1")
        self.assertEqual(key1, key2)

        # Fresh instance pointing to same directory reads the same key
        store2 = FileKeyStore(self.keys_dir)
        self.assertEqual(store2.get_key("test-v1"), key1)

    def test_missing_key_raises_unavailable(self):
        with self.assertRaises(OsCredentialStoreUnavailable):
            self.store.get_key("nonexistent-key")

    def test_delete_key(self):
        self.store.get_or_create_key("to-delete")
        self.store.delete_key("to-delete")
        with self.assertRaises(OsCredentialStoreUnavailable):
            self.store.get_key("to-delete")


class EnvKeyStoreTests(unittest.TestCase):
    def test_derived_key_is_deterministic(self):
        store = EnvKeyStore(master_key="super-secret-cluster-master-key-32-bytes")
        key_v1 = store.get_or_create_key("v1")
        self.assertEqual(len(key_v1), 32)
        self.assertEqual(store.get_key("v1"), key_v1)

        # Another store instance with same master key derives identical KEK
        store2 = EnvKeyStore(master_key="super-secret-cluster-master-key-32-bytes")
        self.assertEqual(store2.get_key("v1"), key_v1)

        # Different key_version derives distinct KEK
        key_v2 = store.get_key("v2")
        self.assertNotEqual(key_v1, key_v2)

    def test_empty_master_key_raises(self):
        with self.assertRaises(OsCredentialStoreUnavailable):
            EnvKeyStore(master_key="")


if __name__ == "__main__":
    unittest.main()
