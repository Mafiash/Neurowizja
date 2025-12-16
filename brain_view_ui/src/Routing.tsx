import React from "react"
import { Login } from "./pages/Login/Login";
import Home


export const Routes: { path: string; element: React.ReactNode }[] = [
  {
    path: "/login",
    element: <Login/>,
  },
  {
    path: ''
  }
];

{
  /* <Routes>
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route element={<Layout />}>
  <Route path="/home" element={<Home />} />
  <Route path="/home/scans" element={<Scans />} />
  <Route
    path="/"
    element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
  />
</Route>
<Route path="*" element={<Navigate to="/" />} />
</Routes> */
}
