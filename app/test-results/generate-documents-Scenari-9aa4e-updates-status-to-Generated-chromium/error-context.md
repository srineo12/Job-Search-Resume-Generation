# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: generate-documents.spec.ts >> Scenario 1 — Document Generation >> Gen button on Open job downloads a valid ZIP and updates status to Generated
- Location: tests/e2e/generate-documents.spec.ts:25:7

# Error details

```
TimeoutError: page.waitForEvent: Timeout 65000ms exceeded while waiting for event "download"
=========================== logs ===========================
waiting for event "download"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - heading "Job Search Assistant" [level=1] [ref=e5]
        - paragraph [ref=e6]: app@local
      - navigation [ref=e7]:
        - link "📊 Dashboard" [ref=e8] [cursor=pointer]:
          - /url: /dashboard
          - generic [ref=e9]: 📊
          - generic [ref=e10]: Dashboard
        - link "📥 Imports" [ref=e11] [cursor=pointer]:
          - /url: /imports
          - generic [ref=e12]: 📥
          - generic [ref=e13]: Imports
        - link "💼 Jobs" [ref=e14] [cursor=pointer]:
          - /url: /jobs
          - generic [ref=e15]: 💼
          - generic [ref=e16]: Jobs
        - paragraph [ref=e18]: Settings
        - link "👤 Profile" [ref=e19] [cursor=pointer]:
          - /url: /settings/profile
          - generic [ref=e20]: 👤
          - generic [ref=e21]: Profile
        - link "✏️ Prompts" [ref=e22] [cursor=pointer]:
          - /url: /settings/prompts
          - generic [ref=e23]: ✏️
          - generic [ref=e24]: Prompts
        - link "🎨 Style" [ref=e25] [cursor=pointer]:
          - /url: /settings/style
          - generic [ref=e26]: 🎨
          - generic [ref=e27]: Style
        - link "🔑 Keyword Sets" [ref=e28] [cursor=pointer]:
          - /url: /settings/keywords
          - generic [ref=e29]: 🔑
          - generic [ref=e30]: Keyword Sets
        - link "🕷️ Apify Actors" [ref=e31] [cursor=pointer]:
          - /url: /settings/actors
          - generic [ref=e32]: 🕷️
          - generic [ref=e33]: Apify Actors
        - link "🔗 Integrations" [ref=e34] [cursor=pointer]:
          - /url: /settings/integrations
          - generic [ref=e35]: 🔗
          - generic [ref=e36]: Integrations
      - generic [ref=e37]:
        - button "🚪 Sign out" [ref=e38]:
          - generic [ref=e39]: 🚪
          - generic [ref=e40]: Sign out
        - paragraph [ref=e41]: v0.5.5 — 2026-05-23
    - main [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]:
            - heading "Jobs v0.6.0" [level=1] [ref=e46]
            - paragraph [ref=e47]: 13 total · 3 hot · 1 good · 0 unranked
          - generic [ref=e48]:
            - button "⚡ Rank All (0)" [disabled] [ref=e49]
            - button "↺ Re-rank" [ref=e50]
            - button "💾 Save Layout" [ref=e51]
        - generic [ref=e52]:
          - generic [ref=e53]: "Category:"
          - button "Teaching Aide - 3" [ref=e55]
        - generic [ref=e56]:
          - generic [ref=e57]: "Priority:"
          - generic [ref=e58]:
            - button "🔥 Hot (3)" [ref=e59]
            - button "✅ Good (1)" [ref=e60]
            - button "🤔 Maybe (2)" [ref=e61]
            - button "❌ Avoid (7)" [ref=e62]
            - button "⏳ Unranked (0)" [ref=e63]
          - generic [ref=e65]: "Status:"
          - generic [ref=e66]:
            - button "Open (9)" [ref=e67]
            - button "Generated (4)" [ref=e68]
            - button "Applied (0)" [ref=e69]
            - button "Discarded (0)" [ref=e70]
        - table [ref=e72]:
          - rowgroup [ref=e91]:
            - row "Job ID Category Job Title Employer Location Role Why Score ↓ Priority Status Salary Type Arrangement Applicants Posted" [ref=e92]:
              - columnheader [ref=e93]:
                - checkbox [ref=e94]
              - columnheader "Job ID" [ref=e95] [cursor=pointer]:
                - generic [ref=e96]: Job ID
              - columnheader "Category" [ref=e98] [cursor=pointer]:
                - generic [ref=e99]: Category
              - columnheader "Job Title" [ref=e101] [cursor=pointer]:
                - generic [ref=e102]: Job Title
              - columnheader "Employer" [ref=e104] [cursor=pointer]:
                - generic [ref=e105]: Employer
              - columnheader "Location" [ref=e107] [cursor=pointer]:
                - generic [ref=e108]: Location
              - columnheader "Role" [ref=e110] [cursor=pointer]:
                - generic [ref=e111]: Role
              - columnheader "Why" [ref=e113] [cursor=pointer]:
                - generic [ref=e114]: Why
              - columnheader "Score ↓" [ref=e116] [cursor=pointer]:
                - generic [ref=e117]:
                  - text: Score
                  - generic [ref=e118]: ↓
              - columnheader "Priority" [ref=e120] [cursor=pointer]:
                - generic [ref=e121]: Priority
              - columnheader "Status" [ref=e123] [cursor=pointer]:
                - generic [ref=e124]: Status
              - columnheader "Salary" [ref=e126] [cursor=pointer]:
                - generic [ref=e127]: Salary
              - columnheader "Type" [ref=e129] [cursor=pointer]:
                - generic [ref=e130]: Type
              - columnheader "Arrangement" [ref=e132] [cursor=pointer]:
                - generic [ref=e133]: Arrangement
              - columnheader "Applicants" [ref=e135] [cursor=pointer]:
                - generic [ref=e136]: Applicants
              - columnheader "Posted" [ref=e138] [cursor=pointer]:
                - generic [ref=e139]: Posted
              - columnheader [ref=e141]
            - row "All All All All All" [ref=e142]:
              - cell [ref=e143]
              - cell [ref=e144]:
                - textbox "filter…" [ref=e145]
              - cell "All" [ref=e146]:
                - combobox [ref=e147]:
                  - option "All" [selected]
                  - option "Teaching Aide - 3"
              - cell [ref=e148]:
                - textbox "filter…" [ref=e149]
              - cell [ref=e150]:
                - textbox "filter…" [ref=e151]
              - cell [ref=e152]:
                - textbox "filter…" [ref=e153]
              - cell [ref=e154]
              - cell [ref=e155]
              - cell [ref=e156]:
                - spinbutton [ref=e157]
              - cell "All" [ref=e158]:
                - combobox [ref=e159]:
                  - option "All" [selected]
                  - option "hot"
                  - option "good"
                  - option "maybe"
                  - option "avoid"
              - cell "All" [ref=e160]:
                - combobox [ref=e161]:
                  - option "All" [selected]
                  - option "open"
                  - option "generated"
                  - option "applied"
                  - option "discarded"
              - cell [ref=e162]:
                - textbox "filter…" [ref=e163]
              - cell "All" [ref=e164]:
                - combobox [ref=e165]:
                  - option "All" [selected]
                  - option "Part time"
                  - option "Full time"
                  - option "Contract/Temp"
              - cell "All" [ref=e166]:
                - combobox [ref=e167]:
                  - option "All" [selected]
                  - option "On-site"
                  - option "Remote"
              - cell [ref=e168]
              - cell [ref=e169]
              - cell [ref=e170]
          - rowgroup [ref=e171]:
            - row "91842259 — Education Support Traineeship - Preston High This role is a traineeship offering on-the-job training and leads to a Certificate III, making it highly suitable for entry-level candidates. AGA Preston, Melbourne VIC Assist students with physical and emotional care while providing classroom support. High score due to the traineeship and training offered. 90 🔥 Hot Generated National Training Wage + Super Part time On-site — 24d ago ▼" [ref=e172]:
              - cell [ref=e173]:
                - checkbox [ref=e174]
              - cell "91842259" [ref=e175]:
                - link "91842259" [ref=e176] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91842259
              - cell "—" [ref=e177]
              - cell "Education Support Traineeship - Preston High This role is a traineeship offering on-the-job training and leads to a Certificate III, making it highly suitable for entry-level candidates." [ref=e178]:
                - link "Education Support Traineeship - Preston High" [ref=e179] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91842259
                - paragraph [ref=e180]: This role is a traineeship offering on-the-job training and leads to a Certificate III, making it highly suitable for entry-level candidates.
              - cell "AGA" [ref=e181]:
                - generic "AGA" [ref=e182]
              - cell "Preston, Melbourne VIC" [ref=e183]:
                - generic "Preston, Melbourne VIC" [ref=e184]
              - cell "Assist students with physical and emotional care while providing classroom support." [ref=e185]:
                - generic "Assist students with physical and emotional care while providing classroom support. Work in a school environment under the supervision of a teacher. Support students with diverse learning needs, including those with disabilities." [ref=e186]: Assist students with physical and emotional care while providing classroom support.
              - cell "High score due to the traineeship and training offered." [ref=e187]:
                - generic "High score due to the traineeship and training offered. Key factor is the opportunity to gain a nationally recognized qualification. Low experience risk as no prior school experience is required." [ref=e188]: High score due to the traineeship and training offered.
              - cell "90" [ref=e189]
              - cell "🔥 Hot" [ref=e190]
              - cell "Generated" [ref=e191]:
                - combobox [ref=e193] [cursor=pointer]:
                  - option "Open"
                  - option "Generated" [selected]
                  - option "Applied"
                  - option "Discarded"
              - cell "National Training Wage + Super" [ref=e194]:
                - generic "National Training Wage + Super" [ref=e195]
              - cell "Part time" [ref=e196]
              - cell "On-site" [ref=e197]
              - cell "—" [ref=e198]
              - cell "24d ago" [ref=e199]
              - cell "▼" [ref=e200]:
                - button "▼" [ref=e201]
            - row "92091519 — Education Support - Victorian Government Schools This role offers a beginner-friendly pathway into education support with opportunities for training and professional development. Department of Education Victoria Melbourne VIC Support the delivery of essential services in schools, including student or teacher support and administrative tasks. High suitability due to the supportive school environment and beginner-friendly nature. 85 🔥 Hot Generated $56,580 – $72,460 per year + 12% Superannuation Full time On-site — 11d ago ▼" [ref=e202]:
              - cell [ref=e203]:
                - checkbox [ref=e204]
              - cell "92091519" [ref=e205]:
                - link "92091519" [ref=e206] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92091519
              - cell "—" [ref=e207]
              - cell "Education Support - Victorian Government Schools This role offers a beginner-friendly pathway into education support with opportunities for training and professional development." [ref=e208]:
                - link "Education Support - Victorian Government Schools" [ref=e209] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92091519
                - paragraph [ref=e210]: This role offers a beginner-friendly pathway into education support with opportunities for training and professional development.
              - cell "Department of Education Victoria" [ref=e211]:
                - generic "Department of Education Victoria" [ref=e212]
              - cell "Melbourne VIC" [ref=e213]:
                - generic "Melbourne VIC" [ref=e214]
              - cell "Support the delivery of essential services in schools, including student or teacher support and administrative tasks." [ref=e215]:
                - generic "Support the delivery of essential services in schools, including student or teacher support and administrative tasks. Work in a collaborative school environment with opportunities for career growth. Engage with students and staff to enhance learning outcomes." [ref=e216]: Support the delivery of essential services in schools, including student or teacher support and administrative tasks.
              - cell "High suitability due to the supportive school environment and beginner-friendly nature." [ref=e217]:
                - generic "High suitability due to the supportive school environment and beginner-friendly nature. Offers a pathway into various education support roles. Medium qualification risk due to potential Certificate III requirement." [ref=e218]: High suitability due to the supportive school environment and beginner-friendly nature.
              - cell "85" [ref=e219]
              - cell "🔥 Hot" [ref=e220]
              - cell "Generated" [ref=e221]:
                - combobox [ref=e223] [cursor=pointer]:
                  - option "Open"
                  - option "Generated" [selected]
                  - option "Applied"
                  - option "Discarded"
              - cell "$56,580 – $72,460 per year + 12% Superannuation" [ref=e224]:
                - generic "$56,580 – $72,460 per year + 12% Superannuation" [ref=e225]
              - cell "Full time" [ref=e226]
              - cell "On-site" [ref=e227]
              - cell "—" [ref=e228]
              - cell "11d ago" [ref=e229]
              - cell "▼" [ref=e230]:
                - button "▼" [ref=e231]
            - row "92091528 — Education Support - Victorian Government Schools This role is marked as hot due to its beginner-friendly nature and the availability of training and support. Department of Education Victoria Yarra Glen, Yarra Valley & High Country VIC Involves supporting students and teachers in various educational settings. Strong support for entry-level applicants with training provided. 85 🔥 Hot Generated $56,580 – $72,460 per year + 12% Superannuation Full time On-site — 11d ago ▼" [ref=e232]:
              - cell [ref=e233]:
                - checkbox [ref=e234]
              - cell "92091528" [ref=e235]:
                - link "92091528" [ref=e236] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92091528
              - cell "—" [ref=e237]
              - cell "Education Support - Victorian Government Schools This role is marked as hot due to its beginner-friendly nature and the availability of training and support." [ref=e238]:
                - link "Education Support - Victorian Government Schools" [ref=e239] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92091528
                - paragraph [ref=e240]: This role is marked as hot due to its beginner-friendly nature and the availability of training and support.
              - cell "Department of Education Victoria" [ref=e241]:
                - generic "Department of Education Victoria" [ref=e242]
              - cell "Yarra Glen, Yarra Valley & High Country VIC" [ref=e243]:
                - generic "Yarra Glen, Yarra Valley & High Country VIC" [ref=e244]
              - cell "Involves supporting students and teachers in various educational settings." [ref=e245]:
                - generic "Involves supporting students and teachers in various educational settings. Work in a collaborative and inclusive school environment. Support roles may include administration, integration aide, and student wellbeing." [ref=e246]: Involves supporting students and teachers in various educational settings.
              - cell "Strong support for entry-level applicants with training provided." [ref=e247]:
                - generic "Strong support for entry-level applicants with training provided. The role offers diverse opportunities across various school settings. The requirement for a WWCC is a minor hurdle but manageable." [ref=e248]: Strong support for entry-level applicants with training provided.
              - cell "85" [ref=e249]
              - cell "🔥 Hot" [ref=e250]
              - cell "Generated" [ref=e251]:
                - combobox [ref=e253] [cursor=pointer]:
                  - option "Open"
                  - option "Generated" [selected]
                  - option "Applied"
                  - option "Discarded"
              - cell "$56,580 – $72,460 per year + 12% Superannuation" [ref=e254]:
                - generic "$56,580 – $72,460 per year + 12% Superannuation" [ref=e255]
              - cell "Full time" [ref=e256]
              - cell "On-site" [ref=e257]
              - cell "—" [ref=e258]
              - cell "11d ago" [ref=e259]
              - cell "▼" [ref=e260]:
                - button "▼" [ref=e261]
            - row "91977611 — Education Support Staff (Fixed Term, Part-time) – Junior School Opportunity This role is suitable for entry-level candidates and does not require prior school experience, making it accessible for Priyadharshini. Kingswood College Box Hill South, Melbourne VIC Assist Year 4 students with learning and wellbeing needs. Role is entry-level and supports Year 4 students, aligning well with Priyadharshini's skills. 75 ✅ Good Open 📄 Gen $57,171-$59,265 +super (term time only) (pro rata) Contract/Temp On-site 236 17d ago ▼" [ref=e262]:
              - cell [ref=e263]:
                - checkbox [ref=e264]
              - cell "91977611" [ref=e265]:
                - link "91977611" [ref=e266] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91977611
              - cell "—" [ref=e267]
              - cell "Education Support Staff (Fixed Term, Part-time) – Junior School Opportunity This role is suitable for entry-level candidates and does not require prior school experience, making it accessible for Priyadharshini." [ref=e268]:
                - link "Education Support Staff (Fixed Term, Part-time) – Junior School Opportunity" [ref=e269] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91977611
                - paragraph [ref=e270]: This role is suitable for entry-level candidates and does not require prior school experience, making it accessible for Priyadharshini.
              - cell "Kingswood College" [ref=e271]:
                - generic "Kingswood College" [ref=e272]
              - cell "Box Hill South, Melbourne VIC" [ref=e273]:
                - generic "Box Hill South, Melbourne VIC" [ref=e274]
              - cell "Assist Year 4 students with learning and wellbeing needs." [ref=e275]:
                - generic "Assist Year 4 students with learning and wellbeing needs. Work in a supportive team environment within a school setting. Facilitate communication between students and teachers, providing general care." [ref=e276]: Assist Year 4 students with learning and wellbeing needs.
              - cell "Role is entry-level and supports Year 4 students, aligning well with Priyadharshini's skills." [ref=e277]:
                - generic "Role is entry-level and supports Year 4 students, aligning well with Priyadharshini's skills. Fixed-term nature may be a concern for long-term employment. No mandatory qualifications required, but some experience in education support is preferred." [ref=e278]: Role is entry-level and supports Year 4 students, aligning well with Priyadharshini's skills.
              - cell "75" [ref=e279]
              - cell "✅ Good" [ref=e280]
              - cell "Open 📄 Gen" [ref=e281]:
                - generic [ref=e282]:
                  - combobox [ref=e283] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e284]
              - cell "$57,171-$59,265 +super (term time only) (pro rata)" [ref=e285]:
                - generic "$57,171-$59,265 +super (term time only) (pro rata)" [ref=e286]
              - cell "Contract/Temp" [ref=e287]
              - cell "On-site" [ref=e288]
              - cell "236" [ref=e289]
              - cell "17d ago" [ref=e290]
              - cell "▼" [ref=e291]:
                - button "▼" [ref=e292]
            - row "92197888 — Teacher Aide The role is beginner-friendly and focuses on classroom support, but prior experience in a school setting is desirable. Ilim College Dallas, Melbourne VIC Support students within the classroom environment and assist teachers. The role is beginner-friendly and involves direct support to students. 65 🤔 Maybe Open 📄 Gen N/A Full time On-site — 5d ago ▼" [ref=e293]:
              - cell [ref=e294]:
                - checkbox [ref=e295]
              - cell "92197888" [ref=e296]:
                - link "92197888" [ref=e297] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92197888
              - cell "—" [ref=e298]
              - cell "Teacher Aide The role is beginner-friendly and focuses on classroom support, but prior experience in a school setting is desirable." [ref=e299]:
                - link "Teacher Aide" [ref=e300] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92197888
                - paragraph [ref=e301]: The role is beginner-friendly and focuses on classroom support, but prior experience in a school setting is desirable.
              - cell "Ilim College" [ref=e302]:
                - generic "Ilim College" [ref=e303]
              - cell "Dallas, Melbourne VIC" [ref=e304]:
                - generic "Dallas, Melbourne VIC" [ref=e305]
              - cell "Support students within the classroom environment and assist teachers." [ref=e306]:
                - generic "Support students within the classroom environment and assist teachers. Work collaboratively in a team to foster a positive learning environment. Engage with students with varying educational needs." [ref=e307]: Support students within the classroom environment and assist teachers.
              - cell "The role is beginner-friendly and involves direct support to students." [ref=e308]:
                - generic "The role is beginner-friendly and involves direct support to students. The focus on classroom support aligns well with Priyadharshini's skills. The requirement for previous experience may pose a challenge." [ref=e309]: The role is beginner-friendly and involves direct support to students.
              - cell "65" [ref=e310]
              - cell "🤔 Maybe" [ref=e311]
              - cell "Open 📄 Gen" [ref=e312]:
                - generic [ref=e313]:
                  - combobox [ref=e314] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e315]
              - cell "N/A" [ref=e316]:
                - generic "N/A" [ref=e317]
              - cell "Full time" [ref=e318]
              - cell "On-site" [ref=e319]
              - cell "—" [ref=e320]
              - cell "5d ago" [ref=e321]
              - cell "▼" [ref=e322]:
                - button "▼" [ref=e323]
            - row "92091588 — Education Support - Victorian Government Schools The role is suitable for entry-level applicants but may require some qualifications or experience that are not clearly defined. Department of Education Victoria Werribee, Melbourne VIC Involves supporting students and teachers in various educational settings. Score is medium due to unclear qualification requirements. 65 🤔 Maybe Open 📄 Gen $56,580 – $72,460 per year + 12% Superannuation Full time On-site — 11d ago ▼" [ref=e324]:
              - cell [ref=e325]:
                - checkbox [ref=e326]
              - cell "92091588" [ref=e327]:
                - link "92091588" [ref=e328] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92091588
              - cell "—" [ref=e329]
              - cell "Education Support - Victorian Government Schools The role is suitable for entry-level applicants but may require some qualifications or experience that are not clearly defined." [ref=e330]:
                - link "Education Support - Victorian Government Schools" [ref=e331] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92091588
                - paragraph [ref=e332]: The role is suitable for entry-level applicants but may require some qualifications or experience that are not clearly defined.
              - cell "Department of Education Victoria" [ref=e333]:
                - generic "Department of Education Victoria" [ref=e334]
              - cell "Werribee, Melbourne VIC" [ref=e335]:
                - generic "Werribee, Melbourne VIC" [ref=e336]
              - cell "Involves supporting students and teachers in various educational settings." [ref=e337]:
                - generic "Involves supporting students and teachers in various educational settings. Work environment is collaborative and inclusive within school communities. Supports diverse roles including administrative tasks and student wellbeing." [ref=e338]: Involves supporting students and teachers in various educational settings.
              - cell "Score is medium due to unclear qualification requirements." [ref=e339]:
                - generic "Score is medium due to unclear qualification requirements. Key factor is the potential for training and support offered. Risk is medium due to possible need for a WWCC." [ref=e340]: Score is medium due to unclear qualification requirements.
              - cell "65" [ref=e341]
              - cell "🤔 Maybe" [ref=e342]
              - cell "Open 📄 Gen" [ref=e343]:
                - generic [ref=e344]:
                  - combobox [ref=e345] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e346]
              - cell "$56,580 – $72,460 per year + 12% Superannuation" [ref=e347]:
                - generic "$56,580 – $72,460 per year + 12% Superannuation" [ref=e348]
              - cell "Full time" [ref=e349]
              - cell "On-site" [ref=e350]
              - cell "—" [ref=e351]
              - cell "11d ago" [ref=e352]
              - cell "▼" [ref=e353]:
                - button "▼" [ref=e354]
            - row "92048446 Teaching Aide - 3 Receptionist and First Aid Officer The role requires prior school administration experience and a Level 2 First Aid Certificate, which are mandatory qualifications. Hudson Ringwood East, Melbourne VIC Manage reception and respond to enquiries from parents, students, and staff. The role requires specific qualifications that Priyadharshini does not possess. 40 ❌ Avoid Generated $40/hr + super Contract/Temp On-site 75 12d ago ▼" [ref=e355]:
              - cell [ref=e356]:
                - checkbox [ref=e357]
              - cell "92048446" [ref=e358]:
                - link "92048446" [ref=e359] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92048446
              - cell "Teaching Aide - 3" [ref=e360]:
                - generic "Teaching Aide - 3" [ref=e361]
              - cell "Receptionist and First Aid Officer The role requires prior school administration experience and a Level 2 First Aid Certificate, which are mandatory qualifications." [ref=e362]:
                - link "Receptionist and First Aid Officer" [ref=e363] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92048446
                - paragraph [ref=e364]: The role requires prior school administration experience and a Level 2 First Aid Certificate, which are mandatory qualifications.
              - cell "Hudson" [ref=e365]:
                - generic "Hudson" [ref=e366]
              - cell "Ringwood East, Melbourne VIC" [ref=e367]:
                - generic "Ringwood East, Melbourne VIC" [ref=e368]
              - cell "Manage reception and respond to enquiries from parents, students, and staff." [ref=e369]:
                - generic "Manage reception and respond to enquiries from parents, students, and staff. Provide administrative support and coordinate First Aid services. Work in a busy school environment focused on student wellbeing." [ref=e370]: Manage reception and respond to enquiries from parents, students, and staff.
              - cell "The role requires specific qualifications that Priyadharshini does not possess." [ref=e371]:
                - generic "The role requires specific qualifications that Priyadharshini does not possess. The need for prior school experience disqualifies her from this position. The role is not entry-level and has mandatory requirements." [ref=e372]: The role requires specific qualifications that Priyadharshini does not possess.
              - cell "40" [ref=e373]
              - cell "❌ Avoid" [ref=e374]
              - cell "Generated" [ref=e375]:
                - combobox [ref=e377] [cursor=pointer]:
                  - option "Open"
                  - option "Generated" [selected]
                  - option "Applied"
                  - option "Discarded"
              - cell "$40/hr + super" [ref=e378]:
                - generic "$40/hr + super" [ref=e379]
              - cell "Contract/Temp" [ref=e380]
              - cell "On-site" [ref=e381]
              - cell "75" [ref=e382]
              - cell "12d ago" [ref=e383]
              - cell "▼" [ref=e384]:
                - button "▼" [ref=e385]
            - row "91853443 — Trainer and Assessor - Celebrancy The role requires substantial experience as a marriage celebrant, which disqualifies Priyadharshini due to lack of relevant experience. Institute of Teacher Aide Courses Melbourne VIC Support adult learners studying celebrancy through marking, feedback, and student support. High qualification risk due to required celebrant experience. 35 ❌ Avoid Open 📄 Gen $43.91 – $55.10 per hour Part time Remote 32 23d ago ▼" [ref=e386]:
              - cell [ref=e387]:
                - checkbox [ref=e388]
              - cell "91853443" [ref=e389]:
                - link "91853443" [ref=e390] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91853443
              - cell "—" [ref=e391]
              - cell "Trainer and Assessor - Celebrancy The role requires substantial experience as a marriage celebrant, which disqualifies Priyadharshini due to lack of relevant experience." [ref=e392]:
                - link "Trainer and Assessor - Celebrancy" [ref=e393] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91853443
                - paragraph [ref=e394]: The role requires substantial experience as a marriage celebrant, which disqualifies Priyadharshini due to lack of relevant experience.
              - cell "Institute of Teacher Aide Courses" [ref=e395]:
                - generic "Institute of Teacher Aide Courses" [ref=e396]
              - cell "Melbourne VIC" [ref=e397]:
                - generic "Melbourne VIC" [ref=e398]
              - cell "Support adult learners studying celebrancy through marking, feedback, and student support." [ref=e399]:
                - generic "Support adult learners studying celebrancy through marking, feedback, and student support. Work from home in a flexible environment with a focus on adult education. Involves monitoring student progress and assisting with webinars." [ref=e400]: Support adult learners studying celebrancy through marking, feedback, and student support.
              - cell "High qualification risk due to required celebrant experience." [ref=e401]:
                - generic "High qualification risk due to required celebrant experience. Role is not aligned with education support or teaching assistant positions. Experience risk is high as the role is specifically for experienced celebrants." [ref=e402]: High qualification risk due to required celebrant experience.
              - cell "35" [ref=e403]
              - cell "❌ Avoid" [ref=e404]
              - cell "Open 📄 Gen" [ref=e405]:
                - generic [ref=e406]:
                  - combobox [ref=e407] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e408]
              - cell "$43.91 – $55.10 per hour" [ref=e409]:
                - generic "$43.91 – $55.10 per hour" [ref=e410]
              - cell "Part time" [ref=e411]
              - cell "Remote" [ref=e412]
              - cell "32" [ref=e413]
              - cell "23d ago" [ref=e414]
              - cell "▼" [ref=e415]:
                - button "▼" [ref=e416]
            - row "92077727 Teaching Aide - 3 Swim School Assistant Manager The role requires prior leadership and teaching experience, making it unsuitable for a beginner. Saltwater Swim School Truganina, Melbourne VIC The role involves managing daily operations of the swim school and supervising staff. High qualification and experience requirements make this role unsuitable. 30 ❌ Avoid Open 📄 Gen $34 – $38 per hour Full time On-site 10 11d ago ▼" [ref=e417]:
              - cell [ref=e418]:
                - checkbox [ref=e419]
              - cell "92077727" [ref=e420]:
                - link "92077727" [ref=e421] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92077727
              - cell "Teaching Aide - 3" [ref=e422]:
                - generic "Teaching Aide - 3" [ref=e423]
              - cell "Swim School Assistant Manager The role requires prior leadership and teaching experience, making it unsuitable for a beginner." [ref=e424]:
                - link "Swim School Assistant Manager" [ref=e425] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92077727
                - paragraph [ref=e426]: The role requires prior leadership and teaching experience, making it unsuitable for a beginner.
              - cell "Saltwater Swim School" [ref=e427]:
                - generic "Saltwater Swim School" [ref=e428]
              - cell "Truganina, Melbourne VIC" [ref=e429]:
                - generic "Truganina, Melbourne VIC" [ref=e430]
              - cell "The role involves managing daily operations of the swim school and supervising staff." [ref=e431]:
                - generic "The role involves managing daily operations of the swim school and supervising staff. Fast-paced environment with a focus on customer service and team leadership. Supports staff, families, and management while also teaching swim lessons." [ref=e432]: The role involves managing daily operations of the swim school and supervising staff.
              - cell "High qualification and experience requirements make this role unsuitable." [ref=e433]:
                - generic "High qualification and experience requirements make this role unsuitable. The role is more senior and involves leadership responsibilities. Lack of training or support for beginners further decreases suitability." [ref=e434]: High qualification and experience requirements make this role unsuitable.
              - cell "30" [ref=e435]
              - cell "❌ Avoid" [ref=e436]
              - cell "Open 📄 Gen" [ref=e437]:
                - generic [ref=e438]:
                  - combobox [ref=e439] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e440]
              - cell "$34 – $38 per hour" [ref=e441]:
                - generic "$34 – $38 per hour" [ref=e442]
              - cell "Full time" [ref=e443]
              - cell "On-site" [ref=e444]
              - cell "10" [ref=e445]
              - cell "11d ago" [ref=e446]
              - cell "▼" [ref=e447]:
                - button "▼" [ref=e448]
            - row "92214111 Teaching Aide - 3 Teacher This role requires a registered teacher with significant experience, making it unsuitable for an entry-level candidate. Indie Education Bacchus Marsh, Bendigo, Goldfields & Macedon Ranges VIC Involves teaching students in small groups or one-on-one, focusing on re-engagement with learning. Score is low due to mandatory teacher registration requirement. 20 ❌ Avoid Open 📄 Gen $117,092 - $131,925 + Super + Salary Packaging Full time On-site — 4d ago ▼" [ref=e449]:
              - cell [ref=e450]:
                - checkbox [ref=e451]
              - cell "92214111" [ref=e452]:
                - link "92214111" [ref=e453] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92214111
              - cell "Teaching Aide - 3" [ref=e454]:
                - generic "Teaching Aide - 3" [ref=e455]
              - cell "Teacher This role requires a registered teacher with significant experience, making it unsuitable for an entry-level candidate." [ref=e456]:
                - link "Teacher" [ref=e457] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92214111
                - paragraph [ref=e458]: This role requires a registered teacher with significant experience, making it unsuitable for an entry-level candidate.
              - cell "Indie Education" [ref=e459]:
                - generic "Indie Education" [ref=e460]
              - cell "Bacchus Marsh, Bendigo, Goldfields & Macedon Ranges VIC" [ref=e461]:
                - generic "Bacchus Marsh, Bendigo, Goldfields & Macedon Ranges VIC" [ref=e462]
              - cell "Involves teaching students in small groups or one-on-one, focusing on re-engagement with learning." [ref=e463]:
                - generic "Involves teaching students in small groups or one-on-one, focusing on re-engagement with learning. The work environment is a non-traditional school setting with a focus on individual learning plans. Supports students who have struggled in conventional education systems." [ref=e464]: Involves teaching students in small groups or one-on-one, focusing on re-engagement with learning.
              - cell "Score is low due to mandatory teacher registration requirement." [ref=e465]:
                - generic "Score is low due to mandatory teacher registration requirement. Key factor is the high level of experience needed for this teaching role. Risk is high as it explicitly seeks a qualified and registered teacher." [ref=e466]: Score is low due to mandatory teacher registration requirement.
              - cell "20" [ref=e467]
              - cell "❌ Avoid" [ref=e468]
              - cell "Open 📄 Gen" [ref=e469]:
                - generic [ref=e470]:
                  - combobox [ref=e471] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e472]
              - cell "$117,092 - $131,925 + Super + Salary Packaging" [ref=e473]:
                - generic "$117,092 - $131,925 + Super + Salary Packaging" [ref=e474]
              - cell "Full time" [ref=e475]
              - cell "On-site" [ref=e476]
              - cell "—" [ref=e477]
              - cell "4d ago" [ref=e478]
              - cell "▼" [ref=e479]:
                - button "▼" [ref=e480]
            - row "91782791 — Classroom Teacher (VCE Vocational Major – Years 11–12) This role requires a Bachelor’s degree in Education and current VIT registration, which Priyadharshini does not possess. BERENGARRA SCHOOL Chadstone, Melbourne VIC Deliver engaging lessons and implement inclusive teaching strategies. Score is low due to high qualification and experience requirements. 20 ❌ Avoid Open 📄 Gen 81,000 – $121,000 per year Full time On-site 19 26d ago ▼" [ref=e481]:
              - cell [ref=e482]:
                - checkbox [ref=e483]
              - cell "91782791" [ref=e484]:
                - link "91782791" [ref=e485] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91782791
              - cell "—" [ref=e486]
              - cell "Classroom Teacher (VCE Vocational Major – Years 11–12) This role requires a Bachelor’s degree in Education and current VIT registration, which Priyadharshini does not possess." [ref=e487]:
                - link "Classroom Teacher (VCE Vocational Major – Years 11–12)" [ref=e488] [cursor=pointer]:
                  - /url: https://au.seek.com/job/91782791
                - paragraph [ref=e489]: This role requires a Bachelor’s degree in Education and current VIT registration, which Priyadharshini does not possess.
              - cell "BERENGARRA SCHOOL" [ref=e490]:
                - generic "BERENGARRA SCHOOL" [ref=e491]
              - cell "Chadstone, Melbourne VIC" [ref=e492]:
                - generic "Chadstone, Melbourne VIC" [ref=e493]
              - cell "Deliver engaging lessons and implement inclusive teaching strategies." [ref=e494]:
                - generic "Deliver engaging lessons and implement inclusive teaching strategies. Work in a supportive environment focused on student wellbeing and engagement. Support students who have experienced challenges in mainstream education." [ref=e495]: Deliver engaging lessons and implement inclusive teaching strategies.
              - cell "Score is low due to high qualification and experience requirements." [ref=e496]:
                - generic "Score is low due to high qualification and experience requirements. Key factor is the mandatory VIT registration and teaching degree. High experience risk due to the need for prior teaching experience." [ref=e497]: Score is low due to high qualification and experience requirements.
              - cell "20" [ref=e498]
              - cell "❌ Avoid" [ref=e499]
              - cell "Open 📄 Gen" [ref=e500]:
                - generic [ref=e501]:
                  - combobox [ref=e502] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e503]
              - cell "81,000 – $121,000 per year" [ref=e504]:
                - generic "81,000 – $121,000 per year" [ref=e505]
              - cell "Full time" [ref=e506]
              - cell "On-site" [ref=e507]
              - cell "19" [ref=e508]
              - cell "26d ago" [ref=e509]
              - cell "▼" [ref=e510]:
                - button "▼" [ref=e511]
            - row "92214969 — Classroom Teacher- Special Education The role requires a minimum of 1-2 years teaching experience, which disqualifies Priyadharshini as a beginner applicant. Southern Autistic School Bentleigh East, Melbourne VIC Involves teaching students with Autism Spectrum Disorder in a specialist setting. Score is low due to mandatory teaching experience requirement. 20 ❌ Avoid Open 📄 Gen N/A Full time On-site 6 4d ago ▼" [ref=e512]:
              - cell [ref=e513]:
                - checkbox [ref=e514]
              - cell "92214969" [ref=e515]:
                - link "92214969" [ref=e516] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92214969
              - cell "—" [ref=e517]
              - cell "Classroom Teacher- Special Education The role requires a minimum of 1-2 years teaching experience, which disqualifies Priyadharshini as a beginner applicant." [ref=e518]:
                - link "Classroom Teacher- Special Education" [ref=e519] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92214969
                - paragraph [ref=e520]: The role requires a minimum of 1-2 years teaching experience, which disqualifies Priyadharshini as a beginner applicant.
              - cell "Southern Autistic School" [ref=e521]:
                - generic "Southern Autistic School" [ref=e522]
              - cell "Bentleigh East, Melbourne VIC" [ref=e523]:
                - generic "Bentleigh East, Melbourne VIC" [ref=e524]
              - cell "Involves teaching students with Autism Spectrum Disorder in a specialist setting." [ref=e525]:
                - generic "Involves teaching students with Autism Spectrum Disorder in a specialist setting. Full-time role in a supportive educational environment with a focus on individual learning plans. Works with a team of specialists to enhance student learning and wellbeing." [ref=e526]: Involves teaching students with Autism Spectrum Disorder in a specialist setting.
              - cell "Score is low due to mandatory teaching experience requirement." [ref=e527]:
                - generic "Score is low due to mandatory teaching experience requirement. Key factor is the need for prior school experience. High qualification and experience risk due to the specific nature of the role." [ref=e528]: Score is low due to mandatory teaching experience requirement.
              - cell "20" [ref=e529]
              - cell "❌ Avoid" [ref=e530]
              - cell "Open 📄 Gen" [ref=e531]:
                - generic [ref=e532]:
                  - combobox [ref=e533] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e534]
              - cell "N/A" [ref=e535]:
                - generic "N/A" [ref=e536]
              - cell "Full time" [ref=e537]
              - cell "On-site" [ref=e538]
              - cell "6" [ref=e539]
              - cell "4d ago" [ref=e540]
              - cell "▼" [ref=e541]:
                - button "▼" [ref=e542]
            - row "92109775 — Education Support Coordinator The role requires prior experience in educational support and leadership, which Priyadharshini does not possess. Sophia Mundi Ltd Abbotsford, Melbourne VIC Leads inclusive education and learning support functions across the school. Role is too senior and requires extensive experience in educational support. 20 ❌ Avoid Open 📄 Gen N/A Full time On-site 25 10d ago ▼" [ref=e543]:
              - cell [ref=e544]:
                - checkbox [ref=e545]
              - cell "92109775" [ref=e546]:
                - link "92109775" [ref=e547] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92109775
              - cell "—" [ref=e548]
              - cell "Education Support Coordinator The role requires prior experience in educational support and leadership, which Priyadharshini does not possess." [ref=e549]:
                - link "Education Support Coordinator" [ref=e550] [cursor=pointer]:
                  - /url: https://au.seek.com/job/92109775
                - paragraph [ref=e551]: The role requires prior experience in educational support and leadership, which Priyadharshini does not possess.
              - cell "Sophia Mundi Ltd" [ref=e552]:
                - generic "Sophia Mundi Ltd" [ref=e553]
              - cell "Abbotsford, Melbourne VIC" [ref=e554]:
                - generic "Abbotsford, Melbourne VIC" [ref=e555]
              - cell "Leads inclusive education and learning support functions across the school." [ref=e556]:
                - generic "Leads inclusive education and learning support functions across the school. Works in a Steiner school environment, overseeing support for students with diagnosed needs. Coordinates assessment processes and supports the development of Individual Education Plans (IEPs)." [ref=e557]: Leads inclusive education and learning support functions across the school.
              - cell "Role is too senior and requires extensive experience in educational support." [ref=e558]:
                - generic "Role is too senior and requires extensive experience in educational support. High qualification risk due to mandatory prior school experience. Not a beginner-friendly position." [ref=e559]: Role is too senior and requires extensive experience in educational support.
              - cell "20" [ref=e560]
              - cell "❌ Avoid" [ref=e561]
              - cell "Open 📄 Gen" [ref=e562]:
                - generic [ref=e563]:
                  - combobox [ref=e564] [cursor=pointer]:
                    - option "Open" [selected]
                    - option "Generated"
                    - option "Applied"
                    - option "Discarded"
                  - button "📄 Gen" [ref=e565]
              - cell "N/A" [ref=e566]:
                - generic "N/A" [ref=e567]
              - cell "Full time" [ref=e568]
              - cell "On-site" [ref=e569]
              - cell "25" [ref=e570]
              - cell "10d ago" [ref=e571]
              - cell "▼" [ref=e572]:
                - button "▼" [ref=e573]
  - generic [ref=e578] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e579]:
      - img [ref=e580]
    - generic [ref=e583]:
      - button "Open issues overlay" [ref=e584]:
        - generic [ref=e585]:
          - generic [ref=e586]: "1"
          - generic [ref=e587]: "2"
        - generic [ref=e588]:
          - text: Issue
          - generic [ref=e589]: s
      - button "Collapse issues badge" [ref=e590]:
        - img [ref=e591]
  - alert [ref=e593]
```

# Test source

```ts
  1   | /**
  2   |  * SCENARIO 1 — Document Generation (E2E)
  3   |  *
  4   |  * Tests the Gen button on an Open job:
  5   |  *   - Triggers a ZIP download
  6   |  *   - ZIP contains 4 files (Resume.docx, Resume.pdf, Cover_Letter.docx, Cover_Letter.pdf)
  7   |  *   - Toast shows success message
  8   |  *   - Row status changes to Generated
  9   |  *   - Gen button is absent on non-Open rows
  10  |  *
  11  |  * LOCAL ONLY — skipped in CI (requires real DB + real API keys).
  12  |  * Run manually:
  13  |  *   cd app && npx playwright test --grep "generate" --headed
  14  |  */
  15  | 
  16  | import { test, expect } from '@playwright/test'
  17  | import JSZip from 'jszip'
  18  | import * as fs from 'fs'
  19  | 
  20  | // Skip entirely in CI
  21  | test.skip(!!process.env.CI, 'Scenario 1 is local-only — requires real API keys and live DB')
  22  | 
  23  | test.describe('Scenario 1 — Document Generation', () => {
  24  | 
  25  |   test('Gen button on Open job downloads a valid ZIP and updates status to Generated', async ({ page }) => {
  26  |     // AI generation can take up to 60s — override the default 30s test timeout
  27  |     test.setTimeout(120_000)
  28  |     // ── 1. Navigate to Jobs page ────────────────────────────────────────────
  29  |     await page.goto('/jobs')
  30  | 
  31  |     // Wait for table rows to load (loading spinner disappears)
  32  |     await expect(page.locator('text=Loading jobs…')).toBeHidden({ timeout: 15_000 })
  33  | 
  34  |     // ── 2. Find the first Open row with a Gen button ────────────────────────
  35  |     const genButton = page.locator('[data-testid^="gen-btn-"]').first()
  36  |     await expect(genButton).toBeVisible({ timeout: 10_000 })
  37  | 
  38  |     // Extract the job ID from the testid attribute
  39  |     const testId = await genButton.getAttribute('data-testid')
  40  |     const jobId = testId?.replace('gen-btn-', '') ?? ''
  41  |     expect(jobId).toBeTruthy()
  42  | 
  43  |     const statusSelect = page.locator(`[data-testid="status-select-${jobId}"]`)
  44  |     await expect(statusSelect).toHaveValue('open')
  45  | 
  46  |     // ── 3. Click Gen and wait for download ──────────────────────────────────
  47  |     const [download] = await Promise.all([
> 48  |       page.waitForEvent('download', { timeout: 65_000 }),
      |            ^ TimeoutError: page.waitForEvent: Timeout 65000ms exceeded while waiting for event "download"
  49  |       genButton.click(),
  50  |     ])
  51  | 
  52  |     // ── 4. Assert: ZIP filename ──────────────────────────────────────────────
  53  |     const filename = download.suggestedFilename()
  54  |     expect(filename).toMatch(/\.zip$/)
  55  | 
  56  |     // ── 5. Assert: ZIP contains exactly 4 expected files ────────────────────
  57  |     const zipPath = await download.path()
  58  |     expect(zipPath).toBeTruthy()
  59  | 
  60  |     const zipBuffer = fs.readFileSync(zipPath!)
  61  |     const zip = await JSZip.loadAsync(zipBuffer)
  62  | 
  63  |     const entries = Object.keys(zip.files).filter(name => !zip.files[name].dir)
  64  |     expect(entries).toHaveLength(4)
  65  | 
  66  |     // Entry names are inside a folder: {Employer}_{Title}_{jobId}/FileName
  67  |     const fileNames = entries.map(e => e.split('/').pop())
  68  |     expect(fileNames).toContain('Resume.docx')
  69  |     expect(fileNames).toContain('Resume.pdf')
  70  |     expect(fileNames).toContain('Cover_Letter.docx')
  71  |     expect(fileNames).toContain('Cover_Letter.pdf')
  72  | 
  73  |     // ── 6. Assert: success toast appears ────────────────────────────────────
  74  |     const successToast = page.locator('[data-testid="toast-success"]')
  75  |     await expect(successToast).toBeVisible({ timeout: 5_000 })
  76  |     await expect(successToast).toContainText('Documents ready')
  77  | 
  78  |     // ── 7. Assert: status dropdown changed to Generated ──────────────────────
  79  |     await expect(statusSelect).toHaveValue('generated', { timeout: 5_000 })
  80  | 
  81  |     // ── 8. Assert: Gen button is gone (status no longer Open) ────────────────
  82  |     await expect(genButton).toBeHidden()
  83  |   })
  84  | 
  85  |   test('Gen button is absent on rows with non-Open status', async ({ page }) => {
  86  |     await page.goto('/jobs')
  87  |     await expect(page.locator('text=Loading jobs…')).toBeHidden({ timeout: 15_000 })
  88  | 
  89  |     // Find any row that is NOT open
  90  |     const nonOpenRow = page.locator('[data-wf]:not([data-wf="open"])').first()
  91  | 
  92  |     // If no non-open rows exist, skip gracefully
  93  |     const count = await nonOpenRow.count()
  94  |     if (count === 0) {
  95  |       test.skip(true, 'No non-Open rows in DB to assert against — run this after generating at least one document')
  96  |       return
  97  |     }
  98  | 
  99  |     await expect(nonOpenRow).toBeVisible()
  100 | 
  101 |     // Extract the job ID from the row's testid
  102 |     const rowTestId = await nonOpenRow.getAttribute('data-testid')
  103 |     const rowJobId = rowTestId?.replace('job-row-', '') ?? ''
  104 | 
  105 |     // Gen button must NOT exist for this job
  106 |     const genBtn = page.locator(`[data-testid="gen-btn-${rowJobId}"]`)
  107 |     await expect(genBtn).toBeHidden()
  108 |   })
  109 | })
  110 | 
```