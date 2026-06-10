"use client";

interface Props {
  srcdoc: string;
}

export default function PreviewFrame({ srcdoc }: Props) {
  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts allow-modals"
      title="Preview"
      className="w-full h-full border-0 bg-white"
    />
  );
}
