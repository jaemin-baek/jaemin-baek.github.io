import React from 'react';
import Layout from './components/Layout';
import Hero from './pages/Hero';
import EngineeringLog from './pages/EngineeringLog';
import Contact from './pages/Contact';

function App() {
  return (
    <Layout>
      <Hero />
      <EngineeringLog />
      <Contact />
    </Layout>
  );
}

export default App;
