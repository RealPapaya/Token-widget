' Launches the Claude Usage Widget detached from the launcher window.
Dim shell, fso, appDir, electronExe, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"
cmd = "cmd /c start ""Claude Usage Widget"" /d """ & appDir & """ """ & electronExe & """ """ & appDir & """"
shell.Run cmd, 0, False
