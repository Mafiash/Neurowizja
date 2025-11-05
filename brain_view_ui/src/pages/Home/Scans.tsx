import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";

const scansData = [
  { id: 1, name: "Scan 1", date: "2024-06-01", status: "Completed" },
  { id: 2, name: "Scan 2", date: "2024-06-05", status: "Pending" },
  { id: 3, name: "Scan 3", date: "2024-06-10", status: "Completed" },
];

export const Scans = () => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {scansData.map((scan) => (
            <TableRow key={scan.id}>
              <TableCell>{scan.id}</TableCell>
              <TableCell>{scan.name}</TableCell>
              <TableCell>{scan.date}</TableCell>
              <TableCell>{scan.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
