'use client'

import React from 'react'
import Link from 'next/link'
import './navbar.css'

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link href="/">
            <span>Khushwant Singh</span>
          </Link>
        </div>
        <div className="navbar-links">
          <Link href="/admin" className="admin-link">
            Admin Dashboard
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
