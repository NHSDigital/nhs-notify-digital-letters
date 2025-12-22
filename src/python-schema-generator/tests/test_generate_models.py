from src.generate_models import main
from argparse import Namespace

class TestGenerateModels:
    """Tests for generate_models module."""

    def test_main_returns_zero_on_success(self, tmp_path):
        """Test that main returns 0 on successful execution."""
        input_dir = tmp_path / "input"
        output_dir = tmp_path / "output"
        input_dir.mkdir()
        output_dir.mkdir()

        (input_dir / "test.flattened.schema.json").write_text(
            '{"title": "TestSchema", "type": "object"}'
        )
        args = Namespace(input_dir=str(input_dir), output_dir=str(output_dir))

        exit_code = main(args)

        assert exit_code == 0

    def test_main_returns_one_on_failure(self):
        """Test that main returns 1 on failure."""
        input_dir = "/nonexistent/input/dir"
        output_dir = "/nonexistent/output/dir"
        args = Namespace(input_dir=str(input_dir), output_dir=str(output_dir))

        exit_code = main(args)
        assert exit_code == 1

    def test_main_generates_a_model_for_each_schema_and_an_init_file(self, tmp_path):
        """Test that main generates Pydantic models from JSON schemas."""
        input_dir = tmp_path / "input"
        output_dir = tmp_path / "output"
        input_dir.mkdir()
        output_dir.mkdir()

        (input_dir / "one.flattened.schema.json").write_text(
            '{"title": "One", "type": "object"}'
        )
        (input_dir / "two.flattened.schema.json").write_text(
            '{"title": "Two", "type": "object"}'
        )

        args = Namespace(input_dir=str(input_dir), output_dir=str(output_dir))

        main(args)

        generated_files = list(output_dir.glob("*.py"))
        assert len(generated_files) == 3
        assert (output_dir / "__init__.py").exists()
        assert (output_dir / "one.py").exists()
        assert (output_dir / "two.py").exists()
