'use client'

import ApiMeTest from './endpoints/ApiMeTest'

const registeredTests = [
  {
    id: 'api-me',
    component: <ApiMeTest key='api-me' />
  }
]

const TestingPage = () => {
  return (
    <div className='flex flex-col gap-6'>
      {registeredTests.map(test => test.component)}
    </div>
  )
}

export default TestingPage