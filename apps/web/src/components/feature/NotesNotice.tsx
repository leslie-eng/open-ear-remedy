import { Link } from 'react-router-dom';

/** One-time notice before a person's first Conversation with a Listener. */
export default function NotesNotice({
  onChoose,
  onCancel,
}: {
  onChoose: (allowNotes: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="notes-notice-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <h2 id="notes-notice-title" className="mb-3 text-xl font-bold text-[#2A2A2A]">
          Before you talk to a Listener
        </h2>
        <p className="mb-3 text-sm text-[#2A2A2A]">
          Listeners may keep a brief private note after your conversation, so the next Listener doesn&apos;t need to
          ask you to repeat your story.
        </p>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-[#6B6B6B]">
          <li>Only Listeners you talk to, and Open Ear admins, can read them.</li>
          <li>Notes are deleted after 12 months.</li>
          <li>Your conversations themselves are never recorded or saved.</li>
          <li>You can turn notes off or delete them any time in your profile.</li>
        </ul>
        <p className="mb-5 text-xs text-[#6B6B6B]">
          See our{' '}
          <Link to="/privacy" className="text-[#0096FF] underline">
            privacy policy
          </Link>
          .
        </p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button onClick={() => onChoose(true)} className="flex-1 cursor-pointer rounded-xl bg-[#0096FF] py-3 font-semibold text-white hover:bg-[#0077CC]">
            Continue
          </button>
          <button
            onClick={() => onChoose(false)}
            className="flex-1 cursor-pointer rounded-xl border-2 border-[#0096FF] py-3 font-semibold text-[#0096FF] hover:bg-[#E6F5FF]"
          >
            Continue without notes
          </button>
        </div>
        <button onClick={onCancel} className="mt-3 w-full cursor-pointer text-sm text-[#6B6B6B] hover:text-[#2A2A2A]">
          Not now
        </button>
      </div>
    </div>
  );
}
