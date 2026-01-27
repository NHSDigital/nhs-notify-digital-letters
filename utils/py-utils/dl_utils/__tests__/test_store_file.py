import os
from dl_utils.store_file import store_file

class TestStoreFile:
    def test_store_file_creates_temp_file(self):
        """Test that store_file creates a temporary file"""
        content = b"test content"

        filename = store_file(content)

        assert filename is not None
        assert os.path.exists(filename)

        # Cleanup
        os.unlink(filename)


    def test_store_file_writes_content(self):
        """Test that store_file writes the correct content to the file"""
        content = b"test content for validation"

        filename = store_file(content)

        with open(filename, 'rb') as f:
            written_content = f.read()

        assert written_content == content

        # Cleanup
        os.unlink(filename)


    def test_store_file_returns_valid_path(self):
        """Test that store_file returns a valid file path"""
        content = b"test"

        filename = store_file(content)

        assert isinstance(filename, str)
        assert len(filename) > 0
        assert os.path.isabs(filename)

        # Cleanup
        os.unlink(filename)


    def test_store_file_multiple_calls_create_different_files(self):
        """Test that multiple calls to store_file create different files"""
        content1 = b"first"
        content2 = b"second"

        filename1 = store_file(content1)
        filename2 = store_file(content2)

        assert filename1 != filename2
        assert os.path.exists(filename1)
        assert os.path.exists(filename2)

        # Cleanup
        os.unlink(filename1)
        os.unlink(filename2)
