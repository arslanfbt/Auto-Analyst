import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Column {
  header: string;
  accessor: string;
  format?: 'currency' | 'number' | 'percentage' | 'date' | 'none';
}

interface UsageTableProps {
  data: any[];
  columns: Column[];
  className?: string;
}

export function UsageTable({ data, columns, className = '' }: UsageTableProps) {
  const formatValue = (value: any, format?: string) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    switch (format) {
      case 'currency':
        return `$${parseFloat(value).toFixed(2)}`;
      case 'number':
        return parseFloat(value).toLocaleString();
      case 'percentage':
        return `${(parseFloat(value) * 100).toFixed(1)}%`;
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return value;
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        No data available
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.accessor}>{column.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {columns.map((column) => (
                <TableCell key={`${rowIndex}-${column.accessor}`}>
                  {formatValue(row[column.accessor], column.format)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 