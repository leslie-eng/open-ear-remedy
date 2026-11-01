# Listener notes instead of transcripts

To give people continuity between Listeners, a Listener may write a short private note after a Conversation; the next Listener matched with the same person sees earlier notes. We keep notes, not transcripts: Text Chat messages are relayed and never stored, and Calls are never recorded, because a store of every conversation would be a large, highly sensitive target under Kenya's Data Protection Act 2019 for little extra benefit.

## Consequences

- Notes are health information: only the Listeners a person talks with and Admins can read them; the person never sees their content, and Listeners still see only the person's Display Name.
- People are told before their first Conversation and can turn notes off; **turning them off also deletes existing notes**, and "Delete notes about me" deletes them at any time.
- Notes older than 12 months are deleted daily (`jobs:purge-notes`) and never shown even if the job has not run yet.
- A Listener report on a conversation can only describe it from memory; there is no transcript to check.
