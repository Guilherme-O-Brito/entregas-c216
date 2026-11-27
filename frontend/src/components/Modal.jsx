import { useEffect, useId, useRef } from "react";

export function Modal({ title, onClose, canClose = true, children }) {
  const dialogRef = useRef(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        if (canClose) onClose();
      }}
      className="m-auto max-h-screen w-full max-w-lg space-y-5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-sm backdrop:bg-slate-900/40"
    >
      <h2 id={headingId} className="text-xl font-bold">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
