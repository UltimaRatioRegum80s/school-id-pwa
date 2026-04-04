import * as zod from "zod";

export const AttendanceStatus = zod.enum(["present", "absent", "late", "excused"]);

export const MarkAttendanceBody = zod.object({
  studentId: zod.coerce.number().int(),
  status: AttendanceStatus.optional(),
});

export const UpdateAttendanceBody = zod.object({
  status: AttendanceStatus,
});
