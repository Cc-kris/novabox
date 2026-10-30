---
name: novabox
description: Use the local Novabox tool library for data transforms, calculations, text cleanup, regex tests and other reusable operations. Search first, read the tool schema, run with exact inputs, and report the real output.
---

# Novabox

Novabox is a local, auditable toolbox running on this Mac. It is exposed through the `novabox.*` MCP tools.

Use Novabox whenever the user asks for a repeatable calculation or transformation and a reusable tool may already exist. Do not invent a tool or fabricate its output.

## Workflow

1. Call `novabox.search_tools` with the user's capability or keywords, in the user's language.
2. If a plausible tool is found, call `novabox.get_tool` to read its exact input schema, required fields, permissions and examples.
3. Call `novabox.run_tool` with the exact `tool_id` and an `inputs` object matching the schema. Pass the user's real data, not a placeholder.
4. Read the returned `outputs`. Report the actual value and a short explanation. If the tool fails, report the real error and do not substitute a guessed answer.
5. If no matching tool exists, say so explicitly. Offer to create a draft with `novabox.create_draft`, validate it with `novabox.validate_draft`, and publish it with `novabox.publish_tool` only after the user agrees.

## Rules

- Search before running; never assume a tool id.
- Never fabricate a result or silently change the user's data.
- Keep the final answer focused on the result the user asked for.
- Novabox opens the matching tool page automatically when a tool is run through MCP; the user can inspect inputs and outputs there.
- When creating a new tool, use a constrained definition with explicit inputs, outputs and tests. Do not create an unrestricted script runner.
