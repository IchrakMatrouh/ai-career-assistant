# FE-04 Workflow Documentation

## Task

Build a settings form for the AI Portfolio application and compare two AI-assisted development approaches.

## Round 1 — Vague Prompt

### Branch
`workflow-vague`

### Prompt
Create a settings form for my portfolio website.

### Approach
The prompt intentionally provided minimal requirements and allowed the AI to make implementation decisions without detailed guidance.

### Result
The generated implementation provided a basic portfolio settings form.

## Round 2 — Precise Prompt

### Branch
`workflow-precise`

### Approach
The second implementation used a detailed prompt with explicit requirements, structure, accessibility expectations, interaction behavior, and testing requirements.

### Result
The implementation was more structured and included automated tests and additional development dependencies.

## Comparison

| Area | Round 1 — Vague | Round 2 — Precise |
|---|---|---|
| Requirements | Minimal | Explicit |
| Accessibility | Not specifically requested | Specifically considered |
| Testing | No tests requested | Tests added |
| Dependencies | Basic | Testing dependencies added |
| Implementation guidance | Low | High |
| Result | Basic implementation | More structured and testable implementation |

## Key Difference

The main difference is the level of instruction given to the AI.

The vague prompt allowed the AI to make most implementation decisions independently, while the precise prompt specified requirements, quality expectations, and testing. As a result, the precise workflow produced a more structured and testable implementation.

## Branches

- `main` — original project
- `workflow-vague` — Round 1
- `workflow-precise` — Round 2

The two workflow branches remain separate for comparison.