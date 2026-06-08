import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import { client } from "~/utils/ApiClient";

export type LearningModuleNote = {
  body: string;
  courseId: string;
  createdAt: string;
  id: string;
  lessonNumber: number;
  lessonTitle: string;
  moduleNumber: number;
  updatedAt: string;
};

type Props = {
  courseId: string;
  moduleNumber: number;
  lessonNumber?: number;
  lessonTitle?: string;
  mode?: "lesson" | "quiz";
};

const brand = {
  surface: "#fffcf5",
  rule: "#dedad1",
  ink: "#20302d",
  muted: "#777a73",
  blue: "#354cef",
  lime: "#edff3d",
  mutedBlock: "#f2efe6",
  mono: '"SFMono-Regular", Consolas, "Liberation Mono", "Courier New", monospace',
};

function UnderwritingModuleNotes({
  courseId,
  lessonNumber,
  lessonTitle,
  mode = "lesson",
  moduleNumber,
}: Props) {
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState<LearningModuleNote[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const draftKey = `dashfi.learning.underwriting.module-notes-draft.${moduleNumber}`;

  const loadNotes = useCallback(() => {
    void client
      .post<{ data: LearningModuleNote[] }>("/learning.notesList", {
        courseId,
        moduleNumber,
      })
      .then((response) => {
        setNotes(response.data);
        setError("");
      })
      .catch(() => setError("Notes are not available yet."));
  }, [courseId, moduleNumber]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(draftKey);
    setDraft(savedDraft ?? "");
  }, [draftKey]);

  useEffect(() => {
    window.localStorage.setItem(draftKey, draft);
  }, [draft, draftKey]);

  const addNote = useCallback(() => {
    const body = draft.trim();
    if (!body || !lessonNumber || !lessonTitle) {
      return;
    }

    setSaving(true);
    void client
      .post<{ data: LearningModuleNote }>("/learning.noteCreate", {
        body,
        courseId,
        lessonNumber,
        lessonTitle,
        moduleNumber,
      })
      .then((response) => {
        setNotes((items) => [...items, response.data]);
        setDraft("");
        setError("");
      })
      .catch(() => setError("Note could not be saved."))
      .finally(() => setSaving(false));
  }, [courseId, draft, lessonNumber, lessonTitle, moduleNumber]);

  return (
    <NotesCard data-testid="module-notes" $mode={mode}>
      <NotesHeader>
        <div>
          <NotesTitle>Notepad</NotesTitle>
          <NotesMeta>
            Module {moduleNumber} notes follow you into the quiz.
          </NotesMeta>
        </div>
        <NotesCount>{notes.length}</NotesCount>
      </NotesHeader>

      {lessonNumber && lessonTitle ? (
        <Composer>
          <NotesArea
            aria-label="Module notes"
            rows={mode === "quiz" ? 4 : 5}
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder="Capture useful details, objections, signals, or phrasing you may need for the quiz."
          />
          <AddNoteButton
            disabled={!draft.trim() || saving}
            onClick={addNote}
            type="button"
          >
            {saving ? "Saving" : "Add note"}
          </AddNoteButton>
        </Composer>
      ) : null}

      {error ? <NotesError>{error}</NotesError> : null}

      <NotesList $mode={mode}>
        {notes.length ? (
          notes.map((note) => (
            <NoteEntry key={note.id}>
              <NoteStamp>
                Module {note.moduleNumber} · Lesson {note.lessonNumber} ·{" "}
                {note.lessonTitle}
              </NoteStamp>
              <NoteBody>{note.body}</NoteBody>
              <NoteDate>{formatNoteDate(note.createdAt)}</NoteDate>
            </NoteEntry>
          ))
        ) : (
          <EmptyNotes>
            Notes you add in this module will stay visible here.
          </EmptyNotes>
        )}
      </NotesList>
    </NotesCard>
  );
}

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

const NotesCard = styled.section<{ $mode: "lesson" | "quiz" }>`
  background: linear-gradient(
    180deg,
    rgba(53, 76, 239, 0.05),
    ${brand.surface} 44%
  );
  border: 1px solid ${brand.rule};
  border-top: 4px solid ${brand.blue};
  border-radius: 8px;
  display: grid;
  gap: 10px;
  min-height: 0;
  padding: ${(props) => (props.$mode === "quiz" ? "14px" : "12px")};
  box-shadow: 0 10px 22px rgba(28, 32, 24, 0.04);
`;

const NotesHeader = styled.div`
  align-items: start;
  display: flex;
  gap: 10px;
  justify-content: space-between;
`;

const NotesTitle = styled.h3`
  color: ${brand.ink};
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
`;

const NotesMeta = styled.p`
  color: ${brand.muted};
  font-size: 12px;
  line-height: 1.35;
  margin: 3px 0 0;
`;

const NotesCount = styled.span`
  align-items: center;
  background: ${brand.mutedBlock};
  border: 1px solid ${brand.rule};
  border-radius: 999px;
  color: ${brand.ink};
  display: inline-flex;
  font-family: ${brand.mono};
  font-size: 12px;
  font-weight: 800;
  height: 26px;
  justify-content: center;
  min-width: 30px;
  padding: 0 8px;
`;

const Composer = styled.div`
  display: grid;
  gap: 8px;
`;

const NotesArea = styled.textarea`
  background: #fff;
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  color: ${brand.ink};
  font: inherit;
  font-size: 13px;
  line-height: 1.35;
  min-height: 96px;
  padding: 10px;
  resize: vertical;
  width: 100%;

  &:focus {
    border-color: ${brand.blue};
    outline: none;
  }
`;

const AddNoteButton = styled.button`
  align-items: center;
  background: ${brand.blue};
  border: 0;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  font-size: 13px;
  font-weight: 800;
  height: 34px;
  justify-content: center;
  justify-self: end;
  padding: 0 14px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const NotesError = styled.div`
  background: #fff1ed;
  border: 1px solid #f1c0b5;
  border-radius: 8px;
  color: #9d2f1f;
  font-size: 12px;
  padding: 8px 10px;
`;

const NotesList = styled.div<{ $mode: "lesson" | "quiz" }>`
  display: grid;
  gap: 8px;
  max-height: ${(props) => (props.$mode === "quiz" ? "520px" : "260px")};
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
`;

const NoteEntry = styled.article`
  background: ${brand.mutedBlock};
  border: 1px solid ${brand.rule};
  border-radius: 8px;
  display: grid;
  gap: 5px;
  padding: 9px;
`;

const NoteStamp = styled.div`
  color: ${brand.blue};
  font-family: ${brand.mono};
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  text-transform: uppercase;
`;

const NoteBody = styled.p`
  color: ${brand.ink};
  font-size: 13px;
  line-height: 1.35;
  margin: 0;
  white-space: pre-wrap;
`;

const NoteDate = styled.div`
  color: ${brand.muted};
  font-size: 11px;
`;

const EmptyNotes = styled.div`
  background: ${brand.mutedBlock};
  border: 1px dashed ${brand.rule};
  border-radius: 8px;
  color: ${brand.muted};
  font-size: 13px;
  line-height: 1.35;
  padding: 12px;
`;

export default UnderwritingModuleNotes;
