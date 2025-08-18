import React from 'react';

export default function dynamic(_importer: any, _options?: any) {
  // Return a component that simply renders its children
  const DynamicMock: React.FC<any> = (props) =>
    React.createElement(React.Fragment, null, props.children);
  return DynamicMock;
}
