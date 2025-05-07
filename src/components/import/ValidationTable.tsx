
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ValidationTableProps {
  data: any[];
}

export function ValidationTable({ data }: ValidationTableProps) {
  if (!data.length) return null;

  return (
    <div className="border rounded-md overflow-auto max-h-80">
      <Table>
        <TableHeader>
          <TableRow>
            {Object.keys(data[0]).map(key => (
              <TableHead key={key}>{key}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.slice(0, 5).map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {Object.values(row).map((value, valueIndex) => (
                <TableCell key={valueIndex}>{String(value)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > 5 && (
        <div className="p-2 text-center text-sm text-muted-foreground">
          Showing 5 of {data.length} rows
        </div>
      )}
    </div>
  );
}
