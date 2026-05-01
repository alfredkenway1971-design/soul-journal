import { useEffect, useRef } from "react";
import { Bold, Italic, List, ListOrdered, Heading, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  placeholder?: string;
  onChange: (html: string, plainText: string) => void;
  minHeight?: number;
}

const exec = (cmd: string, val?: string) => {
  // execCommand is widely supported for contenteditable editors and is the
  // simplest way to ship Bold/Italic/Lists without a heavy editor dep.
  document.execCommand(cmd, false, val);
};

const RichTextEditor = ({ value, placeholder, onChange, minHeight = 200 }: RichTextEditorProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Keep the contenteditable in sync only when the external value differs to avoid
  // overwriting the caret on each keystroke.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    const plain = ref.current.innerText;
    onChange(html, plain);
  };

  const apply = (cmd: string, val?: string) => {
    ref.current?.focus();
    exec(cmd, val);
    handleInput();
  };

  const isEmpty = !value || value === "<br>" || value.replace(/<[^>]+>/g, "").trim() === "";

  return (
    <div className="rounded-2xl border border-border/50 bg-white/60 dark:bg-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-primary/40">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/40 bg-muted/40">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => apply("bold")} aria-label="Bold">
          <Bold className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => apply("italic")} aria-label="Italic">
          <Italic className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => apply("insertUnorderedList")} aria-label="Bulleted list">
          <List className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => apply("insertOrderedList")} aria-label="Numbered list">
          <ListOrdered className="w-4 h-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => apply("formatBlock", "<h3>")} aria-label="Heading">
          <Heading className="w-4 h-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => apply("formatBlock", "<blockquote>")} aria-label="Quote">
          <Quote className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="relative">
        {isEmpty && placeholder && (
          <span className="pointer-events-none absolute top-3 left-4 text-muted-foreground text-sm">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          onInput={handleInput}
          className="prose prose-sm max-w-none px-4 py-3 outline-none text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h3]:text-base [&_h3]:font-semibold"
          style={{ minHeight }}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
