import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@ui/router';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element missing from index.html');

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
