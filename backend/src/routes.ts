import express from 'express';
import {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  toggleDebt,
  deleteAllStudents   
} from './db.js';

export const router = express.Router();

router.get('/students', async (req, res) => {
  const students = await getAllStudents();
  res.json(students);
});

router.get('/students/:id', async (req, res) => {
  const student = await getStudentById(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

router.post('/students', async (req, res) => {
  const student = req.body;
  await createStudent(student);
  res.status(201).json(student);
});

router.put('/students/:id', async (req, res) => {
  const updated = await updateStudent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Student not found' });
  res.json(req.body);
});

router.delete('/students/:id', async (req, res) => {
  const deleted = await deleteStudent(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Student not found' });
  res.status(204).send();
});

router.patch('/students/:id/toggle-debt', async (req, res) => {
  const toggled = await toggleDebt(req.params.id);
  if (!toggled) return res.status(404).json({ error: 'Student not found' });
  res.status(200).json({ success: true });
});

router.delete('/students', async (req, res) => {
  await deleteAllStudents();
  res.status(204).send();
});