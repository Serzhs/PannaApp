import { ApiError } from '@panna/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RecipeForm } from './RecipeForm';
import { recipeFormSchema } from './schema';

describe('recipeFormSchema', () => {
  it('turns the text of the inputs into the body the API accepts', () => {
    const body = recipeFormSchema.parse({
      title: '  Cold beetroot soup ',
      description: '',
      servings: '4',
    });
    expect(body).toEqual({ title: 'Cold beetroot soup', servings: 4 });
  });

  it('keeps a description when given', () => {
    const body = recipeFormSchema.parse({
      title: 'Soup',
      description: 'Chilled, pink.',
      servings: '2',
    });
    expect(body).toEqual({
      title: 'Soup',
      description: 'Chilled, pink.',
      servings: 2,
    });
  });

  /** 0008: total time is derived from the steps, so the form has no field for it. */
  it('has no total time field', async () => {
    await render(
      <RecipeForm submitLabel="Save draft" submitting={false} error={null} onSubmit={jest.fn()} />,
    );
    expect(screen.queryByLabelText(/Total time/)).toBeNull();
  });

  it.each([
    ['a blank title', { title: '   ', servings: '4' }, 'title'],
    ['servings of 0', { title: 'Soup', servings: '0' }, 'servings'],
    ['servings of 1.5', { title: 'Soup', servings: '1.5' }, 'servings'],
    ['servings that are not a number', { title: 'Soup', servings: 'four' }, 'servings'],
  ])('rejects %s on the field it came from', (_name, values, field) => {
    const result = recipeFormSchema.safeParse({
      description: '',
      ...values,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual([field]);
  });
});

describe('RecipeForm', () => {
  it('submits the body once the fields are valid', async () => {
    const onSubmit = jest.fn();
    await render(
      <RecipeForm submitLabel="Save draft" submitting={false} error={null} onSubmit={onSubmit} />,
    );
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Cold beetroot soup');
    await fireEvent.press(screen.getByRole('radio', { name: '4' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ title: 'Cold beetroot soup', servings: 4 });
    });
  });

  it('shows a field error against the field, in words', async () => {
    const onSubmit = jest.fn();
    await render(
      <RecipeForm submitLabel="Save draft" submitting={false} error={null} onSubmit={onSubmit} />,
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    await fireEvent.changeText(screen.getByLabelText('Servings'), '0');
    await fireEvent.press(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => {
      expect(screen.getByLabelText(/^Servings, Servings is a whole number/)).toBeTruthy();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  /** The API validates with the same schema, so a field it names is the field shown. */
  it('puts a field error from the server on that field', async () => {
    const error = new ApiError(
      {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Request body is not valid',
        code: 'VALIDATION_FAILED',
        fields: { title: 'TOO_BIG' },
      },
      400,
    );
    await render(
      <RecipeForm submitLabel="Save draft" submitting={false} error={error} onSubmit={jest.fn()} />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/^Title, Give it a title/)).toBeTruthy();
    });
  });

  it('shows one message for a failure that is not about a field', async () => {
    await render(
      <RecipeForm
        submitLabel="Save draft"
        submitting={false}
        error={new Error('boom')}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByText('Could not save the recipe. Try again.')).toBeTruthy();
  });

  it('disables submit while the request is in flight', async () => {
    await render(
      <RecipeForm submitLabel="Save draft" submitting error={null} onSubmit={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeBusy();
  });
});
