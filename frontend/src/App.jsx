import AppRoutes from './routes/AppRoutes';

/**
 * Application root. Rendering of the actual routes is delegated to AppRoutes;
 * the router provider is set up in main.jsx.
 */
function App() {
  return <AppRoutes />;
}

export default App;
