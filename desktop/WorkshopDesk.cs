using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Windows.Forms;
internal static class WorkshopDesk {
    private const string AppUrl = "https://workshop-desk.web.app/";
    [STAThread] private static void Main() {
        var browser = FindBrowser();
        if (browser == null) {
            MessageBox.Show("Microsoft Edge or Google Chrome is required to open Workshop Desk.", "Workshop Desk", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        try {
            Process.Start(new ProcessStartInfo {
                FileName = browser,
                Arguments = "--app=\"" + AppUrl + "\" --new-window",
                UseShellExecute = false
            });
        } catch (Exception error) {
            MessageBox.Show("Could not open Workshop Desk.\n\n" + error.Message, "Workshop Desk", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
    private static string FindBrowser() {
        string[] names = { "msedge.exe", "chrome.exe" };
        string[] roots = {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData)
        };
        string[] folders = { @"Microsoft\Edge\Application", @"Google\Chrome\Application" };
        for (int i = 0; i < names.Length; i++)
            foreach (var root in roots.Where(root => !String.IsNullOrEmpty(root))) {
                var candidate = Path.Combine(root, folders[i], names[i]);
                if (File.Exists(candidate)) return candidate;
            }
        return null;
    }
}
