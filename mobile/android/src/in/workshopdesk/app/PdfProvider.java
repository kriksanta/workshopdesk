package in.workshopdesk.app;
import android.content.*;import android.database.*;import android.net.Uri;import android.os.*;import android.provider.OpenableColumns;import java.io.*;
public class PdfProvider extends ContentProvider {
 public boolean onCreate(){return true;}
 private File file(Uri uri)throws FileNotFoundException{try{File dir=new File(getContext().getCacheDir(),"pdf").getCanonicalFile(),f=new File(dir,uri.getLastPathSegment()).getCanonicalFile();if(!f.getParentFile().equals(dir)||!f.getName().endsWith(".pdf")||!f.isFile())throw new IOException();return f;}catch(Exception e){throw new FileNotFoundException();}}
 public String getType(Uri u){return "application/pdf";}
 public ParcelFileDescriptor openFile(Uri u,String mode)throws FileNotFoundException{if(!"r".equals(mode))throw new FileNotFoundException();return ParcelFileDescriptor.open(file(u),ParcelFileDescriptor.MODE_READ_ONLY);}
 public Cursor query(Uri u,String[] projection,String selection,String[] args,String sort){try{File f=file(u);MatrixCursor c=new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE});c.addRow(new Object[]{f.getName().replaceFirst("^[0-9]+-",""),f.length()});return c;}catch(Exception e){return null;}}
 public Uri insert(Uri u,ContentValues v){throw new UnsupportedOperationException();}public int delete(Uri u,String s,String[] a){throw new UnsupportedOperationException();}public int update(Uri u,ContentValues v,String s,String[] a){throw new UnsupportedOperationException();}
}
