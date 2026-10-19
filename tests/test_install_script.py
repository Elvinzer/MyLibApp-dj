import os
from pathlib import Path
import subprocess


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "install-mac.sh"


def _installer_env(tmp_path, *, macos_version="15.0"):
    home = tmp_path / "home"
    home.mkdir()
    commands = tmp_path / "commands"
    commands.mkdir()
    (commands / "uname").write_text(
        "#!/bin/sh\ncase \"$1\" in -s) echo Darwin ;; -m) echo arm64 ;; esac\n"
    )
    (commands / "sw_vers").write_text(
        f"#!/bin/sh\necho {macos_version}\n"
    )
    for command in commands.iterdir():
        command.chmod(0o755)
    return home, {
        **os.environ,
        "HOME": str(home),
        "PATH": f"{commands}:/usr/bin:/bin",
    }


def _run_installer(env):
    return subprocess.run(
        ["/bin/bash", str(SCRIPT)],
        env=env,
        capture_output=True,
        text=True,
        timeout=10,
    )


def test_installer_stops_on_unsupported_macos_before_creating_files(tmp_path):
    home, env = _installer_env(tmp_path, macos_version="14.7")

    result = _run_installer(env)

    assert result.returncode == 1
    assert "macOS 15" in result.stderr
    assert not (home / "Applications").exists()


def test_installer_does_not_overwrite_unmarked_existing_folder(tmp_path):
    home, env = _installer_env(tmp_path)
    install_dir = home / "Applications" / "MyLibApp"
    install_dir.mkdir(parents=True)
    existing_file = install_dir / "keep.txt"
    existing_file.write_text("personal file")

    result = _run_installer(env)

    assert result.returncode == 1
    assert "Aucun fichier n’a été remplacé" in result.stderr
    assert existing_file.read_text() == "personal file"
