import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { db } from '../test/db.js';

import { identities, recipes, steps, users } from './schema/index.js';

describe('the test harness', () => {
  it('reaches the database', async () => {
    const rows = await db.execute(sql`select 1 as one`);
    expect(rows[0]).toEqual({ one: 1 });
  });

  // These two prove truncation happens between tests: the same unique email is
  // inserted by both, and neither conflicts with the other.
  it('starts from empty (first)', async () => {
    await db.insert(users).values({ email: 'same@example.com', displayName: 'First' });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('starts from empty (second)', async () => {
    await db.insert(users).values({ email: 'same@example.com', displayName: 'Second' });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it('does not hide commit behaviour: a rolled-back transaction leaves nothing', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.insert(users).values({ email: 'gone@example.com', displayName: 'Gone' });
        throw new Error('deliberate');
      }),
    ).rejects.toThrow('deliberate');

    expect(await db.select().from(users)).toHaveLength(0);
  });
});

describe('the schema', () => {
  it('matches emails case insensitively, so the same address cannot be registered twice', async () => {
    await db.insert(users).values({ email: 'Anna@Example.com', displayName: 'Anna' });
    await expect(
      db.insert(users).values({ email: 'anna@example.com', displayName: 'Also Anna' }),
    ).rejects.toThrow();
  });

  it('deletes a user and takes their recipes with them', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'janis@example.com', displayName: 'Jānis' })
      .returning();
    if (!user) throw new Error('insert returned nothing');

    await db.insert(recipes).values({ authorId: user.id, title: 'Rye bread', servings: 1 });
    await db.delete(users);

    expect(await db.select().from(recipes)).toHaveLength(0);
  });

  it('starts a recipe as a private draft that is not featured', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'a@example.com', displayName: 'A' })
      .returning();
    if (!user) throw new Error('insert returned nothing');

    const [recipe] = await db
      .insert(recipes)
      .values({ authorId: user.id, title: 'Soup', servings: 4 })
      .returning();

    expect(recipe?.status).toBe('draft');
    expect(recipe?.featured).toBe(false);
    expect(recipe?.shareToken).toBeNull();
  });

  it('refuses a parentStepId that points at no step', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'fk@example.com', displayName: 'FK' })
      .returning();
    if (!user) throw new Error('insert returned nothing');
    const [recipe] = await db
      .insert(recipes)
      .values({ authorId: user.id, title: 'Orphan', servings: 1 })
      .returning();
    if (!recipe) throw new Error('insert returned nothing');

    await expect(
      db.insert(steps).values({
        recipeId: recipe.id,
        parentStepId: '00000000-0000-0000-0000-000000000000',
        position: 0,
        body: 'points nowhere',
      }),
    ).rejects.toThrow();
  });

  it('refuses a second identity with the same provider and subject', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'dup@example.com', displayName: 'Dup' })
      .returning();
    if (!user) throw new Error('insert returned nothing');

    await db.insert(identities).values({ userId: user.id, provider: 'google', subject: 's1' });
    await expect(
      db.insert(identities).values({ userId: user.id, provider: 'google', subject: 's1' }),
    ).rejects.toThrow();
  });

  it('lets a step nest under another, and treats a null parent as a main step', async () => {
    const [user] = await db
      .insert(users)
      .values({ email: 'b@example.com', displayName: 'B' })
      .returning();
    if (!user) throw new Error('insert returned nothing');
    const [recipe] = await db
      .insert(recipes)
      .values({ authorId: user.id, title: 'Pork', servings: 4 })
      .returning();
    if (!recipe) throw new Error('insert returned nothing');

    const [main] = await db
      .insert(steps)
      .values({ recipeId: recipe.id, position: 0, body: 'Heat the oven' })
      .returning();
    if (!main) throw new Error('insert returned nothing');

    const [nested] = await db
      .insert(steps)
      .values({ recipeId: recipe.id, parentStepId: main.id, position: 0, body: 'Peel potatoes' })
      .returning();

    expect(main.parentStepId).toBeNull();
    expect(nested?.parentStepId).toBe(main.id);
  });
});
