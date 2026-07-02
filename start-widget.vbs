' Launches the Claude Usage Widget without a console window.
Dim shell, fso, appDir, electronExe
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
electronExe = appDir & "\node_modules\electron\dist\electron.exe"
shell.Run """" & electronExe & """ """ & appDir & """", 0, False
