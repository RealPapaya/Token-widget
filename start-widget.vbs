' Launches the packaged widget when available; falls back to source mode for development.
Dim shell, fso, appDir, packagedExe, electronExe, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
packagedExe = appDir & "\Claude Usage Widget.exe"
electronExe = appDir & "\node_modules\electron\dist\electron.exe"

If fso.FileExists(packagedExe) Then
  cmd = "cmd /c start ""Claude Usage Widget"" /d """ & appDir & """ """ & packagedExe & """"
  shell.Run cmd, 0, False
ElseIf fso.FileExists(electronExe) Then
  cmd = "cmd /c start ""Claude Usage Widget"" /d """ & appDir & """ """ & electronExe & """ """ & appDir & """"
  shell.Run cmd, 0, False
Else
  cmd = "cmd /c """ & appDir & "\start-widget.bat"""
  shell.Run cmd, 1, False
End If
