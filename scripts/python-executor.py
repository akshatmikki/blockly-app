import sys
import io
import contextlib

def execute_python(code):
    """Execute Python code and capture output"""
    output = io.StringIO()
    
    try:
        with contextlib.redirect_stdout(output):
            exec(code)
        return {"output": output.getvalue(), "error": None}
    except Exception as e:
        return {"output": None, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        code = sys.argv[1]
        result = execute_python(code)
        print(result)
