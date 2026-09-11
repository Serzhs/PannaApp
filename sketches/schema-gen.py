#!/usr/bin/env python3
"""Generates Schema.dc.html from the table definitions below.

The diagram is generated rather than drawn so that changing a column is a one-line
edit here, not surgery on 20kb of positioned HTML. Run it after any change to the
data model in CLAUDE.md, then re-seed the canvas.

    python3 schema-gen.py
"""

# name: (column, type, nullable) — or ('~', text, '') for a footnote row
NULL, NOT_NULL = True, False

TABLES = {
    'users': [
        ('id', 'uuid', NOT_NULL), ('email', 'citext', NOT_NULL),
        ('displayName', 'varchar(80)', NOT_NULL), ('locale', 'varchar(5)', NULL),
        ('unitSystem', 'unit_system', NULL), ('createdAt', 'timestamptz', NOT_NULL),
        ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'unique on email', ''), ('~', 'null locale = device, then English', ''),
    ],
    'identities': [
        ('id', 'uuid', NOT_NULL), ('userId', 'uuid', NOT_NULL),
        ('provider', 'auth_provider', NOT_NULL), ('subject', 'varchar(255)', NOT_NULL),
        ('email', 'citext', NULL), ('emailVerified', 'boolean', NOT_NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'unique on (provider, subject)', ''),
        ('~', 'null email = provider did not say', ''),
    ],
    'refresh_tokens': [
        ('id', 'uuid', NOT_NULL), ('userId', 'uuid', NOT_NULL),
        ('tokenHash', 'varchar(64)', NOT_NULL), ('replacedTokenId', 'uuid', NULL),
        ('expiresAt', 'timestamptz', NOT_NULL), ('revokedAt', 'timestamptz', NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'unique on tokenHash', ''),
    ],
    'recipes': [
        ('id', 'uuid', NOT_NULL), ('authorId', 'uuid', NOT_NULL),
        ('sourceRecipeId', 'uuid', NULL), ('title', 'varchar(120)', NOT_NULL),
        ('description', 'text', NULL),
        ('status', 'recipe_status', NOT_NULL), ('servings', 'integer', NOT_NULL),
        ('totalTimeMinutes', 'integer', NULL), ('coverImageKey', 'varchar(255)', NULL),
        ('shareToken', 'varchar(12)', NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'unique on shareToken', ''),
        ('~', 'null shareToken = not shared', ''),
    ],
    'ingredients': [
        ('id', 'uuid', NOT_NULL), ('recipeId', 'uuid', NOT_NULL),
        ('position', 'integer', NOT_NULL), ('name', 'varchar(120)', NOT_NULL),
        ('note', 'text', NULL), ('amount', 'numeric(10,2)', NULL), ('unit', 'unit', NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'unique on (recipeId, position)', ''),
        ('~', 'null amount = "to taste"', ''),
    ],
    'equipment': [
        ('id', 'uuid', NOT_NULL), ('recipeId', 'uuid', NOT_NULL),
        ('position', 'integer', NOT_NULL), ('name', 'varchar(120)', NOT_NULL),
        ('note', 'text', NULL), ('optional', 'boolean', NOT_NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'unique on (recipeId, position)', ''),
    ],
    'steps': [
        ('id', 'uuid', NOT_NULL), ('recipeId', 'uuid', NOT_NULL),
        ('parentStepId', 'uuid', NULL), ('position', 'integer', NOT_NULL),
        ('body', 'text', NOT_NULL), ('note', 'text', NULL),
        ('durationSeconds', 'integer', NULL), ('temperatureCelsius', 'integer', NULL),
        ('imageKey', 'varchar(255)', NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'null parentStepId = a main step', ''),
    ],
    'step_ingredients': [
        ('stepId', 'uuid', NOT_NULL), ('ingredientId', 'uuid', NOT_NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'primary key on both ids', ''),
    ],
    'step_equipment': [
        ('stepId', 'uuid', NOT_NULL), ('equipmentId', 'uuid', NOT_NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'primary key on both ids', ''),
    ],
    'cooks': [
        ('id', 'uuid', NOT_NULL), ('recipeId', 'uuid', NOT_NULL),
        ('startedAt', 'timestamptz', NOT_NULL), ('finishedAt', 'timestamptz', NULL),
        ('excluded', 'jsonb', NOT_NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'null finishedAt = abandoned', ''),
        ('~', 'excluded holds names, not ids', ''),
    ],
    'cook_notes': [
        ('id', 'uuid', NOT_NULL), ('recipeId', 'uuid', NOT_NULL),
        ('stepId', 'uuid', NULL), ('cookId', 'uuid', NULL), ('body', 'text', NOT_NULL),
        ('createdAt', 'timestamptz', NOT_NULL), ('updatedAt', 'timestamptz', NOT_NULL),
        ('~', 'null stepId = whole recipe', ''),
    ],
}

PK = {'users': {'id'}, 'identities': {'id'}, 'refresh_tokens': {'id'}, 'recipes': {'id'},
      'ingredients': {'id'}, 'equipment': {'id'}, 'steps': {'id'}, 'cooks': {'id'},
      'cook_notes': {'id'}, 'step_ingredients': {'stepId', 'ingredientId'},
      'step_equipment': {'stepId', 'equipmentId'}}

# column -> (target table, on delete)
FK = {
    'identities': {'userId': ('users', 'cascade')},
    'refresh_tokens': {'userId': ('users', 'cascade'), 'replacedTokenId': ('refresh_tokens', 'set null')},
    'recipes': {'authorId': ('users', 'cascade'), 'sourceRecipeId': ('recipes', 'set null')},
    'ingredients': {'recipeId': ('recipes', 'cascade')},
    'equipment': {'recipeId': ('recipes', 'cascade')},
    'steps': {'recipeId': ('recipes', 'cascade'), 'parentStepId': ('steps', 'cascade')},
    'step_ingredients': {'stepId': ('steps', 'cascade'), 'ingredientId': ('ingredients', 'cascade')},
    'step_equipment': {'stepId': ('steps', 'cascade'), 'equipmentId': ('equipment', 'cascade')},
    'cooks': {'recipeId': ('recipes', 'cascade')},
    'cook_notes': {'recipeId': ('recipes', 'cascade'), 'stepId': ('steps', 'cascade'),
                   'cookId': ('cooks', 'set null')},
}

COLUMNS = [['users', 'identities', 'refresh_tokens'],
           ['recipes', 'cooks', 'cook_notes'],
           ['ingredients', 'equipment', 'steps'],
           ['step_ingredients', 'step_equipment']]

BOX_W, COL_GAP, ROW_GAP, TOP = 340, 40, 64, 40
HEAD, PAD, ROW, FOOT = 46, 14, 21, 19

def box_h(cols):
    return HEAD + PAD + sum(ROW if c != '~' else FOOT for c, _, _ in cols) + PAD

POS = {}
for ci, col in enumerate(COLUMNS):
    y = TOP
    for name in col:
        POS[name] = (40 + ci * (BOX_W + COL_GAP), y)
        y += box_h(TABLES[name]) + ROW_GAP
W = 40 + len(COLUMNS) * (BOX_W + COL_GAP) + 300
H = max(y + box_h(TABLES[c[-1]]) for c, y in [(col, POS[col[-1]][1]) for col in COLUMNS]) + 60

def render(name):
    x, y = POS[name]; cols = TABLES[name]; h = box_h(cols); rows = ''
    for c, typ, nullable in cols:
        if c == '~':
            rows += f'<div style="font-size:11.5px;color:#a8a5a0;height:{FOOT}px;line-height:{FOOT}px;">{typ}</div>'
            continue
        is_fk = c in FK.get(name, {})
        key = 'PK' if c in PK.get(name, ()) else ('FK' if is_fk else '')
        tag = f'<span style="color:#9a9a9a;font-size:10.5px;width:20px;flex-shrink:0;">{key}</span>'
        nul = ('<span style="font-size:11px;color:#8a8a8a;">null</span>' if nullable
               else '<span style="font-size:11px;color:#c8c5c0;">not null</span>')
        # Every foreign key is a uuid, so the type says nothing the legend has not.
        # That space is worth more spent naming what the key points at.
        if is_fk:
            target, on_delete = FK[name][c]
            right = (f'<span style="color:#7a7772;font-size:11.5px;flex-grow:1;text-align:right;">'
                     f'&rarr; {target}.id <span style="color:#bcb9b4;">{on_delete}</span></span>')
        else:
            right = f'<span style="color:#a8a5a0;font-size:12px;flex-grow:1;text-align:right;">{typ}</span>'
        rows += (f'<div style="display:flex;align-items:baseline;gap:6px;height:{ROW}px;font-size:13.5px;">'
                 f'{tag}<span style="flex-shrink:0;">{c}</span>{right}'
                 f'<span style="width:46px;text-align:right;flex-shrink:0;">{nul}</span></div>')
    return (f'<div class="sk" style="position:absolute;left:{x}px;top:{y}px;width:{BOX_W}px;height:{h}px;'
            f'box-sizing:border-box;background:#fbfaf7;display:flex;flex-direction:column;">'
            f'<div style="padding:10px 14px 8px;font-size:17px;border-bottom:1.5px dashed #cfcfcf;">{name}</div>'
            f'<div style="padding:{PAD}px 14px;display:flex;flex-direction:column;">{rows}</div></div>')

def edge(a, b, dashed=False):
    ax, ay = POS[a]; bx, by = POS[b]
    ah, bh = box_h(TABLES[a]), box_h(TABLES[b])
    if bx > ax:   x1, y1, x2, y2 = ax + BOX_W, ay + ah / 2, bx, by + bh / 2
    elif bx < ax: x1, y1, x2, y2 = ax, ay + ah / 2, bx + BOX_W, by + bh / 2
    elif by > ay: x1, y1, x2, y2 = ax + BOX_W / 2, ay + ah, bx + BOX_W / 2, by
    else:         x1, y1, x2, y2 = ax + BOX_W / 2, ay, bx + BOX_W / 2, by + bh
    if abs(x2 - x1) > 4:
        m = (x1 + x2) / 2; d = f'M{x1} {y1} C{m} {y1}, {m} {y2}, {x2} {y2}'
    else:
        m = (y1 + y2) / 2; d = f'M{x1} {y1} C{x1} {m}, {x2} {m}, {x2} {y2}'
    st = '#8a8a8a' if dashed else '#2b2b2b'
    dash = ' stroke-dasharray="6 5"' if dashed else ''
    return (f'<path d="{d}" stroke="{st}" stroke-width="1.7" fill="none"{dash} />'
            f'<circle cx="{x2}" cy="{y2}" r="3.5" fill="{st}" />')

EDGES = [('users', 'identities', False), ('users', 'refresh_tokens', False),
         ('users', 'recipes', False), ('recipes', 'ingredients', False),
         ('recipes', 'equipment', False), ('recipes', 'steps', False),
         ('recipes', 'cooks', False), ('cooks', 'cook_notes', False),
         ('ingredients', 'step_ingredients', False), ('steps', 'step_ingredients', False),
         ('equipment', 'step_equipment', False), ('steps', 'step_equipment', False)]

sx, sy = POS['steps']; sh = box_h(TABLES['steps'])
loop = (f'<path d="M{sx + BOX_W} {sy + 40} q52 0 52 44 q0 44 -52 44" stroke="#8a8a8a" stroke-width="1.7" '
        f'fill="none" stroke-dasharray="6 5" /><circle cx="{sx + BOX_W}" cy="{sy + 128}" r="3.5" fill="#8a8a8a" />'
        f'<text x="{sx + BOX_W + 58}" y="{sy + 86}" font-size="12" fill="#9a9a9a" '
        f'font-family="Architects Daughter, cursive">nests</text>')

lx = 40 + len(COLUMNS) * (BOX_W + COL_GAP)
side = f'''<div style="position:absolute;left:{lx}px;top:{TOP}px;width:270px;display:flex;flex-direction:column;gap:16px;">
  <div style="font-size:15px;color:#6b6b6b;">Reading it</div>
  <div style="font-size:13px;color:#5a5a5a;line-height:1.5;">Each row is <b>column</b>, then its type, then whether it may be null.</div>
  <div style="font-size:13px;color:#5a5a5a;line-height:1.5;">A foreign key shows <b>&rarr; table.id</b> and what happens when that row is deleted, instead of its type &mdash; every one is a uuid.</div>
  <div style="display:flex;gap:9px;align-items:center;font-size:13px;color:#5a5a5a;">
    <svg width="34" height="10"><path d="M2 5h30" stroke="#2b2b2b" stroke-width="1.7" /></svg>owns it, cascades on delete</div>
  <div style="display:flex;gap:9px;align-items:center;font-size:13px;color:#5a5a5a;">
    <svg width="34" height="10"><path d="M2 5h30" stroke="#8a8a8a" stroke-width="1.7" stroke-dasharray="6 5" /></svg>points at it, may be null</div>
  <div style="font-size:12.5px;color:#8a8a8a;line-height:1.55;">All ids are uuid with a random default. cook_notes also points at steps and cooks; those two lines are left off so the picture stays readable, but every arrow below names its target.</div>
  <div style="height:1px;background:#dedbd6;margin:2px 0;"></div>
  <div style="font-size:12.5px;color:#5a5a5a;line-height:1.55;"><b>recipes is the hub.</b> Ingredients, equipment, steps, cooks and notes all hang off it.</div>
  <div style="font-size:12.5px;color:#5a5a5a;line-height:1.55;"><b>steps nests into itself.</b> A tree, not a graph, so no cycle can exist. One level only, enforced in code.</div>
  <div style="font-size:12.5px;color:#5a5a5a;line-height:1.55;"><b>No foreign key stops a step in recipe A linking an ingredient in recipe B.</b> Checked on write, in the same transaction.</div>
  <div style="font-size:12.5px;color:#5a5a5a;line-height:1.55;"><b>Saving a shared recipe copies it.</b> No shared rows, so one user still owns everything. cooks and cook_notes are never copied.</div>
</div>'''

head = open('SignIn.dc.html').read().split('</helmet>')[0] + '</helmet>\n'
art = head + (f'<div class="paper" style="width:{W}px;height:{H}px;box-sizing:border-box;position:relative;overflow:hidden;">'
              f'<svg width="{W}" height="{H}" style="position:absolute;left:0;top:0;">'
              + ''.join(edge(a, b, d) for a, b, d in EDGES) + loop + '</svg>'
              + ''.join(render(n) for n in TABLES) + side
              + '</div>\n</x-dc>\n</body>\n</html>\n')
open('Schema.dc.html', 'w').write(art)
print(f'Schema.dc.html  {W} x {H}  ({len(TABLES)} tables, {sum(len(c) for c in TABLES.values())} rows)')
