import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const labelStyle = {
  fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: 1, marginBottom: 4, display: "block",
};

const btn = (bg, small = true) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 12 : 14,
  fontWeight: 600, cursor: "pointer",
});

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const fmtSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

const fileIcon = (type, name) => {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (ext === "pdf") return "📄";
  if (["doc", "docx"].includes(ext)) return "📝";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
  if (["ppt", "pptx"].includes(ext)) return "📽️";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "🖼️";
  if (["zip", "rar", "7z"].includes(ext)) return "🗄️";
  return "📎";
};

export default function AttachmentManager({ dealId, dealName }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (dealId) loadAttachments();
  }, [dealId]);

  const loadAttachments = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("deal_attachments")
      .select("*")
      .eq("deal_id", dealId)
      .order("uploaded_at", { ascending: false });
    if (!err && data) setAttachments(data);
    setLoading(false);
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const newAttachments = [];

    for (const file of files) {
      // 50MB max per file
      if (file.size > 50 * 1024 * 1024) {
        setError(`${file.name} is too large (50MB max)`);
        continue;
      }

      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${dealId}/${Date.now()}_${safeName}`;

        // Upload to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from("deal-attachments")
          .upload(filePath, file);

        if (uploadErr) {
          setError(`Upload failed for ${file.name}: ${uploadErr.message}`);
          continue;
        }

        // Save metadata to deal_attachments table
        const attachment = {
          id: uid(),
          deal_id: dealId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_at: new Date().toISOString(),
        };

        const { data: row, error: dbErr } = await supabase
          .from("deal_attachments")
          .insert(attachment)
          .select()
          .single();

        if (dbErr) {
          setError(`Saved file but DB error: ${dbErr.message}`);
          // Try cleanup
          await supabase.storage.from("deal-attachments").remove([filePath]);
          continue;
        }

        newAttachments.push(row);
      } catch (e) {
        setError(`Error: ${e.message}`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...newAttachments, ...prev]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const downloadFile = async (att) => {
    const { data, error: err } = await supabase.storage
      .from("deal-attachments")
      .createSignedUrl(att.file_path, 60);
    if (err) {
      setError(`Download failed: ${err.message}`);
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const deleteFile = async (att) => {
    if (!window.confirm(`Delete ${att.file_name}?`)) return;
    await supabase.storage.from("deal-attachments").remove([att.file_path]);
    await supabase.from("deal_attachments").delete().eq("id", att.id);
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  };

  if (!dealId) {
    return (
      <div style={{ padding: 20, color: "#64748b", fontSize: 13, textAlign: "center" }}>
        Save the deal first to add attachments
      </div>
    );
  }

  return (
    <div>
      <label style={labelStyle}>Attachments</label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          background: dragOver ? "#1e293b" : "#0f1322",
          border: `2px dashed ${dragOver ? "#6366f1" : "#2a3150"}`,
          borderRadius: 8,
          padding: "20px 16px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s",
          marginBottom: 12,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
        <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
        <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 600, marginBottom: 4 }}>
          {uploading ? "Uploading..." : "Drop files here or click to upload"}
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>
          NDAs, CIMs, financials, etc · 50MB max per file
        </div>
      </div>

      {error && (
        <div style={{
          background: "#7f1d1d", color: "#fca5a5", padding: "8px 12px",
          borderRadius: 6, fontSize: 12, marginBottom: 10,
        }}>
          {error}
          <button
            style={{ float: "right", background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}
            onClick={() => setError(null)}
          >✕</button>
        </div>
      )}

      {/* Attachment list */}
      {loading ? (
        <div style={{ fontSize: 12, color: "#64748b", padding: 8 }}>Loading...</div>
      ) : attachments.length === 0 ? (
        <div style={{ fontSize: 12, color: "#475569", padding: 8, textAlign: "center" }}>
          No attachments yet
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {attachments.map((att) => (
            <div
              key={att.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#0f1322", border: "1px solid #1e293b",
                borderRadius: 6, padding: "8px 12px",
              }}
            >
              <span style={{ fontSize: 18 }}>{fileIcon(att.file_type, att.file_name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.file_name}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  {fmtSize(att.file_size)} · {new Date(att.uploaded_at).toLocaleDateString()}
                </div>
              </div>
              <button style={btn("#0ea5e9")} onClick={() => downloadFile(att)}>Download</button>
              <button style={btn("#dc2626")} onClick={() => deleteFile(att)}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
