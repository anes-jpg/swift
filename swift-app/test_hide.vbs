Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c timeout 5", 0, True
