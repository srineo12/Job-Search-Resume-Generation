# Google Drive Storage Specification

## 1. Overview

All generated resumes and cover letters are stored in Google Drive. The app uses the Google Drive API via OAuth. No files are stored on Vercel or in Supabase (only metadata).

## 2. Auth Method

**OAuth 2.0** (user-owned Drive).

- User connects their Google account via OAuth consent screen.
- Scope: `https://www.googleapis.com/auth/drive.file` — limited to files the app creates. This is the least-privilege scope and is sufficient.
- Refresh token and access token stored in `integrations` row for the `google_drive` provider.
- Access tokens refreshed on demand when expired.

Service account is not used in MVP — it complicates Drive sharing for a personal account.

## 3. Folder Structure
/JobApps/                           ← root folder, ID stored in integrations.credentials
/{Employer}{TitleSlug}{jobId}/  ← per-job folder
Resume_PriyadharshiniSelvam_{Employer}{TitleSlug}v1.pdf
Resume_PriyadharshiniSelvam{Employer}{TitleSlug}v1.docx
CoverLetter_PriyadharshiniSelvam{Employer}{TitleSlug}v1.pdf
CoverLetter_PriyadharshiniSelvam{Employer}{TitleSlug}_v1.docx
job_description.txt             ← snapshot of the JD at time of generation

`{jobId}` is a short prefix of the job UUID (first 8 chars) to keep folder names readable but unique.

## 4. Folder Creation Logic

On first generation for a job:
1. Check `jobs.drive_folder_id` (denormalised cache) or `generated_documents.drive_folder_id` for an existing folder.
2. If none, create folder under root: `POST /drive/v3/files` with `mimeType: application/vnd.google-apps.folder`.
3. Store the resulting folder ID on the job row.

## 5. File Upload Flow

1. Renderer produces DOCX and PDF in memory (Buffer).
2. App calls Drive API: `POST /upload/drive/v3/files?uploadType=multipart`.
3. Metadata: `name`, `parents: [folder_id]`, `mimeType`.
4. Response includes file ID.
5. App generates a shareable link: `GET /drive/v3/files/{file_id}?fields=webViewLink`.
6. File ID and link stored in `generated_documents`.

## 6. Sharing

- Default: files are private (visible only to the user who owns the Drive).
- The app does not change permissions automatically.
- User can manually share files in Drive if needed.

## 7. Versioning

- New versions create new files (not Drive's built-in revision system).
- Filenames include `v{n}`.
- Old versions remain in the same folder.
- This avoids confusion when downloading; each version is a separate file.

## 8. Quota Considerations

- Google Drive free tier: 15 GB shared across Drive, Gmail, Photos.
- Each PDF ~50–150 KB; each DOCX ~30–80 KB.
- 1,000 generated files ≈ ~200 MB. Well within free quota.
- App displays current Drive quota usage (optional, future).

## 9. Auth Token Refresh

- Access tokens last ~1 hour.
- Refresh logic: on every Drive API call, check expiry; if within 5 minutes of expiring, call refresh endpoint.
- If refresh fails (token revoked), set integration status `disconnected` and prompt user to reconnect.

## 10. Deletion

- App does not delete Drive files automatically.
- If the user deletes a job in the app, files remain in Drive (with a warning shown).
- A future "Clean up Drive" admin action can be added.

## 11. Failure Handling

- If upload fails after render: structured JSON is still saved in DB; user can retry upload.
- Drive errors are logged in `generated_documents.raw_ai_response` or a dedicated error column (TBD in implementation).

## 12. Environment Variables Needed

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

The OAuth client is created in Google Cloud Console under a free project (no billing required).