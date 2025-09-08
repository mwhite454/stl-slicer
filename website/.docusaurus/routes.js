import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/',
    component: ComponentCreator('/', '744'),
    routes: [
      {
        path: '/',
        component: ComponentCreator('/', '997'),
        routes: [
          {
            path: '/',
            component: ComponentCreator('/', '365'),
            routes: [
              {
                path: '/dev/makerjs-exporter',
                component: ComponentCreator('/dev/makerjs-exporter', '8a9'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/slicing-adapter',
                component: ComponentCreator('/dev/slicing-adapter', '1e5'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/slicing-core',
                component: ComponentCreator('/dev/slicing-core', '6c8'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/slicing-metadata',
                component: ComponentCreator('/dev/slicing-metadata', 'fdd'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/slicing-plane',
                component: ComponentCreator('/dev/slicing-plane', 'a2a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/slicing-pure',
                component: ComponentCreator('/dev/slicing-pure', '8fb'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/ui-stl-slicer',
                component: ComponentCreator('/dev/ui-stl-slicer', 'be1'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/workspace-stage-2d',
                component: ComponentCreator('/dev/workspace-stage-2d', 'f00'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/dev/workspace-store',
                component: ComponentCreator('/dev/workspace-store', 'f75'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/slicing-flow',
                component: ComponentCreator('/slicing-flow', '0ea'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/stl',
                component: ComponentCreator('/stl', '15b'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/user-flow-upload-to-2d',
                component: ComponentCreator('/user-flow-upload-to-2d', '846'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
