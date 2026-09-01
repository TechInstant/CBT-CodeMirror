import React, { useState, useContext } from "react";
import axios from "axios";
import { CSVLink } from "react-csv";
import Papa from "papaparse";
import { toast } from "react-toastify";
import { Download, Pencil, Trash2, Check, X, Users, UserPlus, Upload } from "lucide-react";
import { baseUrl, GetToken } from "../App";
import { StudentsContext, Student } from "../Context/StudentContext";
import {
  Card,
  PageHeader,
  Button,
  Input,
  TableWrap,
  Th,
  Td,
  EmptyState,
  Badge,
  Modal,
} from "./ui";

const StudentList: React.FC = () => {
  const context = useContext(StudentsContext);
  if (!context) {
    throw new Error("StudentList must be used within a StudentsProvider");
  }
  const { students, setStudents } = context;

  const [searchTerm, setSearchTerm] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [importing, setImporting] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newStudent, setNewStudent] = useState({
    StudentId: "",
    FirstName: "",
    LastName: "",
    Department: "",
    Email: "",
  });

  /*
    Adding one student, without re-uploading the whole roster. A latecomer or a
    correction during a live sitting previously meant preparing another CSV.
    Password mirrors the CSV import, which uses the surname.
  */
  const handleAddStudent = async () => {
    if (!newStudent.StudentId.trim() || !newStudent.LastName.trim()) {
      toast.error("Matric number and last name are required.");
      return;
    }
    setAdding(true);
    try {
      const idToken = await GetToken();
      const payload = {
        ...newStudent,
        StudentId: newStudent.StudentId.trim(),
        Role: "Student",
        Password: newStudent.LastName.trim(),
      };
      await axios.post(`${baseUrl}/students`, payload, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setStudents((prev) => [...prev, { ...payload, Scores: 0 } as Student]);
      setShowAdd(false);
      setNewStudent({
        StudentId: "",
        FirstName: "",
        LastName: "",
        Department: "",
        Email: "",
      });
      toast.success("Student added");
    } catch (error: any) {
      toast.error(
        "Could not add student: " +
          (error?.response?.data?.error || error?.message || "unknown error")
      );
    } finally {
      setAdding(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    [student.FirstName, student.LastName, student.StudentId, student.Department]
      .some((field) => (field ?? "").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEditClick = (student: Student) => {
    setEditingStudentId(student.StudentId);
    setEditFormData({ ...student });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Scores is numeric on the document; sending it as a string would change the
    // stored field's type.
    setEditFormData((prev) => ({
      ...prev,
      [name]: name === "Scores" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (studentId: string) => {
    try {
      const idToken = await GetToken();
      const updatedStudentId = studentId.replace(/\//g, "_");

      const updatedData = { ...editFormData, StudentId: updatedStudentId };

      await axios.patch(`${baseUrl}/students/${updatedStudentId}`, updatedData, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      // Update the context state
      setStudents((prev) =>
        prev.map((student) =>
          student.StudentId === studentId ? { ...student, ...editFormData } : student
        )
      );

      setEditingStudentId(null);
      setEditFormData({});
      toast.success("Student updated");
    } catch (error: any) {
      // This used to fail silently, so a save that never persisted still looked
      // like it had worked until the page was reloaded.
      toast.error(
        "Could not update student: " +
          (error?.response?.data?.error || error?.message || "unknown error")
      );
    }
  };

  /*
    Bulk import straight into the roster. The upload wizard only ever imported
    students as a side effect of creating a paper, so topping up a roster between
    sittings meant creating a throwaway exam.
  */
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ({ target }) => {
      if (!target?.result) return;
      Papa.parse(target.result as string, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const rows = (results.data as any[]).map((r) => {
            const names = r.Names ? String(r.Names).split(" ") : ["", ""];
            return {
              StudentId: r.MatricNo || "",
              FirstName: names[1] || " ",
              LastName: names[0] || " ",
              Department: r.Department || " ",
              Password: r.Password || names[0] || " ",
              Role: "Student",
              Email: r.Email || " ",
            };
          });

          const existing = new Set(students.map((s) => s.StudentId));
          const toCreate = rows.filter((r) => r.StudentId && !existing.has(r.StudentId));

          if (toCreate.length === 0) {
            toast.info("Nothing to import — every student in that file is already listed.");
            return;
          }

          setImporting({ done: 0, total: toCreate.length, failed: 0 });
          const idToken = await GetToken();
          let failed = 0;
          const added: Student[] = [];

          for (let i = 0; i < toCreate.length; i++) {
            try {
              await axios.post(`${baseUrl}/students`, toCreate[i], {
                headers: { Authorization: `Bearer ${idToken}` },
              });
              added.push({ ...toCreate[i], Scores: 0 } as unknown as Student);
            } catch {
              failed++;
            }
            setImporting({ done: i + 1, total: toCreate.length, failed });
          }

          setStudents((prev) => [...prev, ...added]);
          setImporting(null);
          const skipped = rows.length - toCreate.length;
          if (failed) {
            toast.warn(
              `${added.length} added, ${failed} failed${skipped ? `, ${skipped} already listed` : ""}.`
            );
          } else {
            toast.success(
              `${added.length} students added${skipped ? `, ${skipped} already listed` : ""}.`
            );
          }
        },
      });
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-importing the same file
  };

  const handleDelete = async (studentId: string) => {
    try {
      const idToken = await GetToken();
      const updatedStudentId = studentId.replace(/\//g, "_");

      await axios.delete(`${baseUrl}/students/${updatedStudentId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      setStudents((prev) => prev.filter((student) => student.StudentId !== studentId));
      toast.success("Student deleted");
    } catch (error: any) {
      toast.error(
        "Could not delete student: " +
          (error?.response?.data?.error || error?.message || "unknown error")
      );
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${students.length} registered${
          searchTerm ? ` · ${filteredStudents.length} matching` : ""
        }`}
        actions={
          <>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <UserPlus className="h-4 w-4" />
              Add student
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!!importing}
              onClick={() => document.getElementById("studentCsvImport")?.click()}
            >
              <Upload className="h-4 w-4" />
              {importing
                ? `Importing ${importing.done}/${importing.total}…`
                : "Import CSV"}
            </Button>
            <input
              id="studentCsvImport"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvImport}
            />
            <CSVLink data={students} filename="students_results.csv">
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CSVLink>
          </>
        }
      />

      {showAdd && (
        <Modal
          title="Add a student"
          onClose={() => setShowAdd(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStudent} disabled={adding}>
                {adding ? "Adding…" : "Add student"}
              </Button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Matric number *
              </span>
              <Input
                value={newStudent.StudentId}
                placeholder="CSC/2021/001"
                onChange={(e) =>
                  setNewStudent((s) => ({ ...s, StudentId: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                First name
              </span>
              <Input
                value={newStudent.FirstName}
                onChange={(e) =>
                  setNewStudent((s) => ({ ...s, FirstName: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Last name *
              </span>
              <Input
                value={newStudent.LastName}
                onChange={(e) =>
                  setNewStudent((s) => ({ ...s, LastName: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Department
              </span>
              <Input
                value={newStudent.Department}
                onChange={(e) =>
                  setNewStudent((s) => ({ ...s, Department: e.target.value }))
                }
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Email
              </span>
              <Input
                value={newStudent.Email}
                onChange={(e) =>
                  setNewStudent((s) => ({ ...s, Email: e.target.value }))
                }
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            They sign in with their matric number and their last name as the
            password, the same as students loaded from a CSV.
          </p>
        </Modal>
      )}

      <Card>
        <div className="border-b border-slate-200 p-4">
          <Input
            type="search"
            placeholder="Search by name, matric number or department…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title={students.length === 0 ? "No students yet" : "No matches"}
            hint={
              students.length === 0
                ? "Upload a student CSV from the Upload page to get started."
                : "Try a different name, matric number or department."
            }
          />
        ) : (
          <TableWrap maxHeight="calc(100vh - 20rem)">
            <thead>
              <tr>
                <Th>First Name</Th>
                <Th>Last Name</Th>
                <Th>Matric No.</Th>
                <Th>Department</Th>
                <Th>Email</Th>
                <Th>Score</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                const isEditing = editingStudentId === student.StudentId;
                return (
                  <tr
                    key={student.StudentId}
                    className={isEditing ? "bg-navy-50/40" : "hover:bg-slate-50"}
                  >
                    {isEditing ? (
                      <>
                        <Td>
                          <Input
                            name="FirstName"
                            value={editFormData.FirstName || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td>
                          <Input
                            name="LastName"
                            value={editFormData.LastName || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td className="font-mono text-xs">{student.StudentId}</Td>
                        <Td>
                          <Input
                            name="Department"
                            value={editFormData.Department || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td>
                          <Input
                            name="Email"
                            value={editFormData.Email || ""}
                            onChange={handleEditChange}
                          />
                        </Td>
                        <Td>
                          <Input
                            type="number"
                            name="Scores"
                            min={0}
                            value={editFormData.Scores ?? ""}
                            onChange={handleEditChange}
                            className="w-24"
                          />
                        </Td>
                        <Td>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(student.StudentId)}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={handleCancelEdit}>
                              <X className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </div>
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td className="font-medium text-navy-900">{student.FirstName}</Td>
                        <Td className="font-medium text-navy-900">{student.LastName}</Td>
                        <Td className="font-mono text-xs">{student.StudentId}</Td>
                        <Td>
                          <Badge tone="navy">{student.Department || "—"}</Badge>
                        </Td>
                        <Td className="text-slate-500">{student.Email || "—"}</Td>
                        <Td>{student.Scores ?? "—"}</Td>
                        <Td>
                          <div className="flex justify-end gap-2">
                            {pendingDelete === student.StudentId ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => handleDelete(student.StudentId)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPendingDelete(null)}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleEditClick(student)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => setPendingDelete(student.StudentId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </Td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
};

export default StudentList;
