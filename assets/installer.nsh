; BentoBay installer extras: a wizard page that ASKS about shortcuts, which use the BentoBay logo.
!include nsDialogs.nsh
!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER
Var ScDlg
Var ScDesktopCb
Var ScStartCb
Var ScDesktop
Var ScStart

Function ShortcutPageCreate
  !ifmacrodef MUI_HEADER_TEXT
    !insertmacro MUI_HEADER_TEXT "Shortcuts" "Choose where to put BentoBay shortcuts."
  !endif
  nsDialogs::Create 1018
  Pop $ScDlg
  ${If} $ScDlg == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 24u "Select the shortcuts to create. They use the BentoBay logo."
  Pop $0
  ${NSD_CreateCheckbox} 0 34u 100% 12u "Create a &Desktop shortcut"
  Pop $ScDesktopCb
  ${NSD_CreateCheckbox} 0 52u 100% 12u "Create a &Start Menu shortcut"
  Pop $ScStartCb
  ${If} $ScDesktop == ""
    StrCpy $ScDesktop ${BST_CHECKED}
  ${EndIf}
  ${If} $ScStart == ""
    StrCpy $ScStart ${BST_CHECKED}
  ${EndIf}
  ${NSD_SetState} $ScDesktopCb $ScDesktop
  ${NSD_SetState} $ScStartCb $ScStart
  nsDialogs::Show
FunctionEnd

Function ShortcutPageLeave
  ${NSD_GetState} $ScDesktopCb $ScDesktop
  ${NSD_GetState} $ScStartCb $ScStart
FunctionEnd
!endif

; Silent installs (/S) skip the page, so default both shortcuts to ON.
!macro customInit
  !ifndef BUILD_UNINSTALLER
    StrCpy $ScDesktop ${BST_CHECKED}
    StrCpy $ScStart ${BST_CHECKED}
  !endif
!macroend

!macro customPageAfterChangeDir
  !ifndef BUILD_UNINSTALLER
    Page custom ShortcutPageCreate ShortcutPageLeave
  !endif
!macroend

!macro customInstall
  ${If} $ScDesktop == ${BST_CHECKED}
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\icon.ico" 0
  ${EndIf}
  ${If} $ScStart == ${BST_CHECKED}
    CreateShortCut "$SMPROGRAMS\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\icon.ico" 0
    WinShell::SetLnkAUMI "$SMPROGRAMS\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  ${EndIf}
!macroend

!macro customUnInstall
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
  Delete "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
!macroend
