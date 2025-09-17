"use client"

import React from "react"

export const processTableMarkersInErrorOutput = (content: string): React.ReactNode => {
  if (!content || typeof content !== 'string') {
    return <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">{content}</pre>;
  }

  // Split content by table markers
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const tableMarkerRegex = /<TABLE_START>([\s\S]*?)<TABLE_END>/g;
  let match;
  let partIndex = 0;

  while ((match = tableMarkerRegex.exec(content)) !== null) {
    // Add text before the table
    if (match.index > lastIndex) {
      const beforeTable = content.substring(lastIndex, match.index);
      if (beforeTable.trim()) {
        parts.push(
          <pre key={`before-${partIndex}`} className="text-xs text-red-700 font-mono whitespace-pre-wrap">
            {beforeTable}
          </pre>
        );
      }
    }

    // Process the table content
    const tableContent = match[1];
    const parseTableContent = (tableContent: string) => {
      const lines = tableContent.trim().split('\n');
      const headers = lines[0].split('\t');
      const dataRows = lines.slice(1);

      return (
        <table className="min-w-full border-collapse border border-red-300">
          <thead>
            <tr className="bg-red-100">
              {headers.map((header, index) => (
                <th key={index} className="border border-red-300 px-2 py-1 text-left text-xs font-medium text-red-800">
                  {header.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => {
              const cells = row.split('\t');
              return (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-red-50' : 'bg-white'}>
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-red-300 px-2 py-1 text-xs text-red-700">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    };

    // Add the formatted table
    parts.push(
      <div key={`table-${partIndex}`} className="bg-white border border-red-200 rounded-lg p-3 my-2 shadow-sm">
        {parseTableContent(tableContent)}
      </div>
    );

    lastIndex = match.index + match[0].length;
    partIndex++;
  }

  // Add remaining content after the last table
  if (lastIndex < content.length) {
    const remainingContent = content.substring(lastIndex);
    if (remainingContent.trim()) {
      parts.push(
        <pre key={`after-${partIndex}`} className="text-xs text-red-700 font-mono whitespace-pre-wrap">
          {remainingContent}
        </pre>
      );
    }
  }

  // If no tables were found, return the original content as pre
  if (parts.length === 0) {
    return (
      <pre className="text-xs text-red-700 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">
        {content}
      </pre>
    );
  }

  return <div>{parts}</div>;
};

export const processTableMarkersInOutput = (content: string): React.ReactNode => {
  if (!content || typeof content !== 'string') {
    return <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">{content}</pre>;
  }

  // Split content by table markers
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const tableMarkerRegex = /<TABLE_START>([\s\S]*?)<TABLE_END>/g;
  let match;
  let partIndex = 0;

  while ((match = tableMarkerRegex.exec(content)) !== null) {
    // Add text before the table
    if (match.index > lastIndex) {
      const beforeTable = content.substring(lastIndex, match.index);
      if (beforeTable.trim()) {
        parts.push(
          <pre key={`before-${partIndex}`} className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
            {beforeTable}
          </pre>
        );
      }
    }

    // Process the table content
    const tableContent = match[1];
    const parseTableContent = (tableContent: string) => {
      const lines = tableContent.trim().split('\n');
      const headers = lines[0].split('\t');
      const dataRows = lines.slice(1);

      return (
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              {headers.map((header, index) => (
                <th key={index} className="border border-gray-300 px-2 py-1 text-left text-xs font-medium text-gray-800">
                  {header.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIndex) => {
              const cells = row.split('\t');
              return (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  {cells.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-gray-300 px-2 py-1 text-xs text-gray-800">
                      {cell.trim()}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    };

    // Add the formatted table
    parts.push(
      <div key={`table-${partIndex}`} className="bg-white border border-gray-200 rounded-lg p-3 my-2 shadow-sm">
        {parseTableContent(tableContent)}
      </div>
    );

    lastIndex = match.index + match[0].length;
    partIndex++;
  }

  // Add remaining content after the last table
  if (lastIndex < content.length) {
    const remainingContent = content.substring(lastIndex);
    if (remainingContent.trim()) {
      parts.push(
        <pre key={`after-${partIndex}`} className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
          {remainingContent}
        </pre>
      );
    }
  }

  // If no tables were found, return the original content as pre
  if (parts.length === 0) {
    return (
      <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap overflow-auto max-h-[400px]">
        {content}
      </pre>
    );
  }

  return <div>{parts}</div>;
};
