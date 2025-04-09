import { useState } from 'react'
import ytLogo from './assets/yt-logo.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function App() {

  const [url ,setUrl] = useState('')
  const [loader, setLoader] = useState(false)
  let [error, setError] = useState('')

  const downloadVideo = async () => {

    try {
          let response = await fetch('http://localhost:3000/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
          })

          if (!response.ok) {
            response = await response.json()
            console.log('response: ', response.error)
            setUrl('')
            setError(response.error)
          }

            console.log(response)
            setError('')
            console.log('Everthing is fine!!')

    } catch (err) {
        console.log(err)
    }

  }

  const downloadAudio = async () => {
    console.log('Loading Audio')
  }

  return (
    <>
      <div 
        className="flex h-screen"
      >

        <div 
          id="left" 
          className="w-2/3 h-full bg-black"
        >
          <div 
            className="text-6xl text-center mt-52 font-extrabold"
          >

            <span 
              className="block bg-clip-text m-3 text-transparent bg-gradient-to-r from-rose-300 to-rose-900"
            >
              Quick YouTube Video Summaries,
            </span>

            <span 
              className="bg-clip-text text-transparent bg-gradient-to-r from-rose-300 to-rose-900"
            >
              Downloads for Audio/Video, One URL!
            </span>

          </div>
          
            <div 
              className='relative mt-28 text-center'
            >

              <label 
                htmlFor="url"
              >
                {/* <img
                  className='absolute top-1/2 transform -translate-y-1/2 h-40 w-40'
                  src={ytLogo}
                  alt="yt-logo"

                /> */}
                <input
                  type="text"
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setError('')
                  }}
                  value={url}
                  placeholder={`${error ? 'Please Enter Valid YouTube URL' : 'Enter YouTube URL'}`}
                  className={`w-11/12 h-16 rounded-2xl bg-rose-200 pl-32 outline-none 
                    focus:outline-none text-xl ${error ? 
                    'border-2 border-red-500 placeholder-red-400 focus:bg-white hover:bg-white' 
                    : ' focus:bg-white placeholder-slate-400 hover:bg-white border-none' }
                  `}
                />
              </label>
              
            </div>

            <div 
              className='flex justify-center my-16'
            >
              <button 
                className='text-center text-2xl mx-6 bg-gradient-to-r from-rose-500 to-rose-900 hover:from-rose-900 hover:to-rose-500 outline-none focus:outline-none focus:border-white focus:ring-2 focus:ring-white focus:from-rose-900 focus:to-rose-500 font-extrabold rounded-3xl w-1/5 h-20'
                onClick={ downloadVideo }
              >
                Video
              </button>

              <button 
                className='text-center text-2xl bg-gradient-to-r from-rose-500 to-rose-900 hover:from-rose-900 hover:to-rose-500 outline-none focus:outline-none focus:border-white focus:ring-2 focus:ring-white focus:from-rose-900 focus:to-rose-500 font-extrabold rounded-3xl w-1/5 h-20'
                onClick={ downloadAudio }
              >
                Audio
              </button>

            </div>


        </div>
        
        <div 
          id="right" 
          className="w-1/3 h-full bg-rose-600"
        >

        </div>

      </div>
    </>
  )
}

export default App