import { useCallback, useEffect, useRef } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-sql";

function highlightSqlCode(code) {
  const highlighted = Prism.highlight(String(code ?? ""), Prism.languages.sql || Prism.languages.clike, "sql");
  return highlighted.replace(
    /<span class="token operator">(AND|OR)<\/span>/gi,
    '<span class="token keyword token-logical">$1</span>',
  );
}

export function SqlHighlightEditor({ value, onChange, disabled }) {
  const wrapperRef = useRef(null);

  const syncHighlightScroll = useCallback((inputEl, preEl) => {
    const left = Number(inputEl?.scrollLeft || 0);
    const top = Number(inputEl?.scrollTop || 0);
    preEl.style.transform = `translate(${-left}px, ${-top}px)`;
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const inputEl = wrapper.querySelector(".sql-textarea-input");
    const preEl = wrapper.querySelector(".sql-textarea-pre");
    if (!inputEl || !preEl) return undefined;

    const onScroll = () => syncHighlightScroll(inputEl, preEl);
    onScroll();
    inputEl.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      inputEl.removeEventListener("scroll", onScroll);
      preEl.style.transform = "";
    };
  }, [syncHighlightScroll]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const inputEl = wrapper.querySelector(".sql-textarea-input");
    const preEl = wrapper.querySelector(".sql-textarea-pre");
    if (!inputEl || !preEl) return;

    syncHighlightScroll(inputEl, preEl);
  }, [value, disabled, syncHighlightScroll]);

  return (
    <div ref={wrapperRef} className="sql-highlight-editor-wrap">
      <Editor
        value={String(value ?? "")}
        onValueChange={onChange}
        highlight={highlightSqlCode}
        padding={12}
        className={`sql-textarea sql-highlight-editor ${disabled ? "disabled" : ""}`}
        textareaClassName="sql-textarea-input"
        preClassName="sql-textarea-pre"
        disabled={disabled}
        spellCheck={false}
        style={{
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: "0.84rem",
          lineHeight: 1.42,
        }}
      />
    </div>
  );
}
