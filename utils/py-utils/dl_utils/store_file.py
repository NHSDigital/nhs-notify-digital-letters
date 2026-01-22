import tempfile

def store_file(content):
    """
    Writes a temp file and returns the name
    """
    with tempfile.NamedTemporaryFile(delete=False) as file:
        file.write(content)
        file.close()
        return file.name
