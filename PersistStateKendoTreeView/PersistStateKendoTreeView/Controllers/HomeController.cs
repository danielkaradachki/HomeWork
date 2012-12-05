using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using PersistStateKendoTreeView.Models;

namespace PersistStateKendoTreeView.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            
            ViewData["Customers"] = GetData();

            ViewData["ExpandedNodes"] = Request.Cookies["ExpandedNodes"] != null ?
                                        HttpUtility.UrlDecode(Request.Cookies["ExpandedNodes"].Value).Split(';')
                                      : new string[] { };

            return View();
        }

        private IEnumerable<Customer> GetData()
        {
            NorthwindEntities context = new NorthwindEntities();
            return from c in context.Customers.Take(10) select c;
        }

        public ActionResult About()
        {
            return View();
        }
    }
}
