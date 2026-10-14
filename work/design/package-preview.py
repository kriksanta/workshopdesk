from pathlib import Path
import base64,json,re,zipfile
root=Path(__file__).parent
dist=root/'dist'
out=root.parent.parent/'outputs'
out.mkdir(exist_ok=True)
html=(dist/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(dist/'style.css').read_text(encoding='utf-8')+'</style>')
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','')
icon='data:image/png;base64,'+base64.b64encode((dist/'icon-192.png').read_bytes()).decode()
html=html.replace('href="icon-192.png"',f'href="{icon}"')
for name in ['catalog.js','attendance.js','account-install.js','app.js']:
 html=html.replace(f'<script src="{name}"></script>','<script>'+(dist/name).read_text(encoding='utf-8')+'</script>')
(out/'Workshop-Desk.html').write_text(html,encoding='utf-8')
readme='''WORKSHOP DESK — DESIGN PREVIEW

OPEN THE DESIGN
Open Workshop-Desk.html in a modern browser. The separate App ZIP is a deployable static website, not an APK.
Initial admin username: admin
Password: the password you supplied in the chat (unchanged).
The username field is blank, with a neutral placeholder.

ADMIN PROFILE
Settings > Admin profile & login lets you change the display name and login username independently from shop details. Sign out, then use the new username with the existing password. Changes reset on refresh in this design-only version.

EMPLOYEES
The one Example Employee has no password until the admin sets one. Edit it or add a new employee and set a password. The employee's phone number is always their username. Sign out and sign in in the SAME tab to test role changes. Added accounts are not shared between devices or tabs yet.

CLEAN START
One example employee, one example customer, and one example job card remain for understanding the workflow. There are no prefilled sales, invoices, stock requests or attendance records. All 203 spare-part names and the complete vehicle catalog are retained. Every part starts with quantity 0 and price 0.

CLEAR BUTTONS
Clear empties editable fields in customer, employee, inventory, job-card, invoice/estimate, attendance, settings and admin-profile forms. The login screen has no Clear button. It clears WhatsApp message drafts too. It does not delete an existing record unless you subsequently save changes. Hidden record IDs are preserved during editing.

ATTENDANCE
Employees request check-in. The employer sees an approval request in Dashboard and Attendance. Pending and rejected requests do not count as Present. Approval confirms attendance. After approval, the employee can check out. Check-out retains that day's Present status.
Both roles have a current-month calendar and Present / Leave / LOP (loss of pay) / Holiday summaries. Employees see their own calendar; the employer selects an employee. The employer can mark dates or mark a holiday for all employees. Unmarked days and Sundays are not automatically LOP or holidays. No payroll calculations are performed.

INSTALL ON MOBILE / TABLET
The Install app button invokes the browser install prompt when available; otherwise it explains the appropriate browser steps. Local file URLs cannot be installed as PWAs. Upload the contents of Workshop-Desk-App.zip to an HTTPS static host. Keep the directory structure; serve manifest.webmanifest as application/manifest+json. On a phone/tablet, open that hosted URL in a supported browser and use Install app / Add to Home Screen. Safari on iPhone/iPad: Share > Add to Home Screen.
The package includes the manifest and 192px/512px app icons. No service worker, offline cache, or data persistence has been added. Installation does not preserve records across reloads.
Reference: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

DESIGN SCOPE
No database, browser record storage, or Google Sheets integration is connected. Accounts and records last only for the current page session and reset on refresh. Login and permissions demonstrate the intended workflow; secure production authentication still needs a backend. The app has not been published to an HTTPS host or app store.

PRINT AND WHATSAPP
Shop details and logo are applied to printable job cards, invoices and estimates. Browser printing supports a printer or Save as PDF. Review WhatsApp updates before opening WhatsApp; sending is manual. Replace example customer details before sending anything.

FILES
Workshop-Desk.html: single-file local preview.
Workshop-Desk-Design.zip: local preview, this guide and editable source.
Workshop-Desk-App.zip: static web app files at ZIP root, ready for HTTPS hosting.
'''
(out/'README.txt').write_text(readme,encoding='utf-8')
with zipfile.ZipFile(out/'Workshop-Desk-Design.zip','w',zipfile.ZIP_DEFLATED) as z:
 z.write(out/'Workshop-Desk.html','Workshop-Desk.html')
 z.write(out/'README.txt','README.txt')
 for f in dist.iterdir():
  if f.is_file():z.write(f,'source/'+f.name)
with zipfile.ZipFile(out/'Workshop-Desk-App.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in dist.iterdir():
  if f.is_file():z.write(f,f.name)
 z.write(out/'README.txt','README.txt')
manifest=json.loads((dist/'manifest.webmanifest').read_text())
assert all((dist/icon['src']).is_file() for icon in manifest['icons'])
assert '<script src=' not in html and 'href="style.css"' not in html
print('Packaged standalone design, editable source ZIP and installable web-app bundle; asset references verified.')
