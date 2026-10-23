<%@ Page Language="C#" ValidateRequest="false" EnableViewState="false" EnableSessionState="False" %>
<%@ Import Namespace="System" %>
<%@ Import Namespace="System.IO" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Text" %>
<script runat="server">
protected void Page_Load(object sender, EventArgs e)
{
    Response.TrySkipIisCustomErrors = true;
    string raw = Request.RawUrl ?? "/";
    int q = raw.IndexOf('?');
    string pathAndQuery = q >= 0 ? raw : raw;
    string path = q >= 0 ? raw.Substring(0, q) : raw;
    string qs = q >= 0 ? raw.Substring(q) : "";
    int idx = path.IndexOf("/vds-api", StringComparison.OrdinalIgnoreCase);
    string rest = idx >= 0 ? path.Substring(idx + "/vds-api".Length) : path;
    if (string.IsNullOrEmpty(rest)) rest = "/";
    if (!rest.StartsWith("/")) rest = "/" + rest;
    string target = "http://127.0.0.1:8787" + rest + qs;

    HttpWebRequest up = (HttpWebRequest)WebRequest.Create(target);
    up.Method = Request.HttpMethod;
    up.Timeout = 60000;
    up.ReadWriteTimeout = 60000;
    up.KeepAlive = false;
    up.AutomaticDecompression = DecompressionMethods.None;
    up.AllowAutoRedirect = false;
    up.ContentType = Request.ContentType;

    string auth = Request.Headers["Authorization"];
    if (!string.IsNullOrEmpty(auth)) up.Headers["Authorization"] = auth;
    string apiKey = Request.Headers["X-Api-Key"];
    if (!string.IsNullOrEmpty(apiKey)) up.Headers["X-Api-Key"] = apiKey;
    string reqId = Request.Headers["X-Request-Id"];
    if (!string.IsNullOrEmpty(reqId)) up.Headers["X-Request-Id"] = reqId;

    if (Request.HttpMethod != "GET" && Request.HttpMethod != "HEAD")
    {
        byte[] body;
        using (var ms = new MemoryStream())
        {
            Request.InputStream.CopyTo(ms);
            body = ms.ToArray();
        }
        up.ContentLength = body.Length;
        using (var s = up.GetRequestStream())
        {
            s.Write(body, 0, body.Length);
        }
    }

    HttpWebResponse down = null;
    try
    {
        down = (HttpWebResponse)up.GetResponse();
    }
    catch (WebException ex)
    {
        down = ex.Response as HttpWebResponse;
        if (down == null)
        {
            Response.StatusCode = 502;
            Response.ContentType = "application/json; charset=utf-8";
            Response.Write("{\"error\":\"VDS API kapalı\"}");
            Response.End();
            return;
        }
    }

    Response.StatusCode = (int)down.StatusCode;
    string ct = down.ContentType;
    if (!string.IsNullOrEmpty(ct)) Response.ContentType = ct;
    using (var src = down.GetResponseStream())
    {
        if (src != null) src.CopyTo(Response.OutputStream);
    }
    down.Close();
    Response.End();
}
</script>
