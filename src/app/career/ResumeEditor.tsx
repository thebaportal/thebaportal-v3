"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { Extension } from "@tiptap/core";
import { useState, useEffect, useCallback } from "react";

const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [{
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontSize || null,
          renderHTML: (attrs: Record<string, string>) =>
            attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }];
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sectionsToHtml(sections: Record<string, any>, name: string): string {
  const parts: string[] = [];
  if (name) parts.push(`<h1>${escHtml(name)}</h1>`);
  if (sections.professionalSummary) {
    parts.push(`<h2>PROFESSIONAL SUMMARY</h2><p>${escHtml(sections.professionalSummary)}</p>`);
  }
  if (Array.isArray(sections.coreCompetencies) && sections.coreCompetencies.length) {
    parts.push(`<h2>CORE COMPETENCIES</h2><ul>${sections.coreCompetencies.map((c: string) => `<li>${escHtml(c)}</li>`).join("")}</ul>`);
  }
  if (Array.isArray(sections.keyAchievements) && sections.keyAchievements.length) {
    parts.push(`<h2>KEY ACHIEVEMENTS</h2><ul>${sections.keyAchievements.map((a: string) => `<li>${escHtml(a)}</li>`).join("")}</ul>`);
  }
  if (sections.experienceBullets && typeof sections.experienceBullets === "object") {
    parts.push(`<h2>PROFESSIONAL EXPERIENCE</h2>`);
    for (const [role, bullets] of Object.entries(sections.experienceBullets as Record<string, string[]>)) {
      parts.push(`<h3>${escHtml(role)}</h3><ul>${(bullets as string[]).map(b => `<li>${escHtml(b)}</li>`).join("")}</ul>`);
    }
  }
  if (sections.education) {
    parts.push(`<h2>EDUCATION</h2><p>${escHtml(sections.education)}</p>`);
  }
  if (sections.certifications) {
    parts.push(`<h2>CERTIFICATIONS</h2><p>${escHtml(sections.certifications)}</p>`);
  }
  return parts.join("");
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const FONTS = ["Calibri", "Arial", "Georgia", "Times New Roman", "Helvetica"];
const SIZES = ["10pt", "11pt", "12pt", "13pt", "14pt", "16pt", "18pt"];

interface Props {
  html: string;
  onChange: (plainText: string) => void;
}

export function ResumeEditor({ html, onChange }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: html,
    onUpdate({ editor }) {
      onChange(editor.getText());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height: 520px",
          "padding: 24px 28px",
          "font-size: 13px",
          "line-height: 1.7",
          "color: #0f172a",
          "font-family: Calibri, Arial, sans-serif",
          "outline: none",
        ].join(";"),
      },
    },
  });

  useEffect(() => {
    if (editor && html && editor.isEmpty) {
      editor.commands.setContent(html);
    }
  }, [editor, html]);

  const setFontFamily = useCallback((font: string) => {
    editor?.chain().focus().setFontFamily(font).run();
  }, [editor]);

  const setFontSize = useCallback((size: string) => {
    editor?.chain().focus().setMark("textStyle", { fontSize: size }).run();
  }, [editor]);

  if (!mounted || !editor) return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", minHeight: "520px", background: "#fff" }} />
  );

  const btn = (active: boolean) => ({
    padding: "4px 9px",
    borderRadius: "5px",
    border: "1px solid",
    borderColor: active ? "#0f172a" : "#e2e8f0",
    background: active ? "#0f172a" : "#fff",
    color: active ? "#fff" : "#0f172a",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1,
  } as React.CSSProperties);

  const sel = {
    padding: "4px 8px",
    borderRadius: "5px",
    border: "1px solid #e2e8f0",
    fontSize: "12px",
    color: "#0f172a",
    background: "#fff",
    cursor: "pointer",
    fontFamily: "inherit",
  } as React.CSSProperties;

  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#fff" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap" }}>
        <button style={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><b>B</b></button>
        <button style={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></button>
        <button style={btn(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></button>
        <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 2px" }} />
        <button style={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</button>
        <div style={{ width: 1, height: 20, background: "#e2e8f0", margin: "0 2px" }} />
        <select style={sel} onChange={e => setFontFamily(e.target.value)} defaultValue="">
          <option value="" disabled>Font</option>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select style={sel} onChange={e => setFontSize(e.target.value)} defaultValue="">
          <option value="" disabled>Size</option>
          {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Editor */}
      <style>{`
        .resume-editor h1 { font-size: 22px; font-weight: 700; margin: 0 0 4px; color: #0f172a; }
        .resume-editor h2 { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: #64748b; margin: 20px 0 6px; border-bottom: 2px solid #1d4ed8; padding-bottom: 3px; }
        .resume-editor h3 { font-size: 13px; font-weight: 700; color: #0f172a; margin: 12px 0 4px; }
        .resume-editor ul { margin: 0 0 8px 0; padding-left: 18px; }
        .resume-editor li { margin-bottom: 3px; }
        .resume-editor p { margin: 0 0 8px; }
        .resume-editor:focus-within { outline: none; }
      `}</style>
      <div className="resume-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
