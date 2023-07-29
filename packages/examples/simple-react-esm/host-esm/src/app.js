import React from 'react'

import Button from 'remote_app/Button';
import Button1 from 'remote_app/Button1';
import {Button2 as Btn2} from 'remote_app/Button2';
import Btn, {Button3 as Btn3} from 'remote_app/Button3';

import {s1, s2} from 'react'

export {Button4} from 'remote_app/Button4'

console.log("s1,s2", s1, s2)
console.log(Button1)
console.log(Btn2)
console.log(Btn, Btn3)

const App = () => {
  return (
    <React.Suspense fallback="Loading App...">
      <h1>Rollup Host ESM</h1>
      <Button />
      <Button1 />
    </React.Suspense>
  )
}
export default App
