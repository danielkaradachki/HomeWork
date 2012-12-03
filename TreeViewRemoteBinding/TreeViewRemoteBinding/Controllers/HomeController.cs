using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Kendo.Mvc.UI;
using TreeViewRemoteBinding.Models;

namespace TreeViewRemoteBinding.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            ViewBag.Message = "Welcome to ASP.NET MVC!";

            return View();
        }

        public JsonResult Employees(TreeViewItem item)
        {
            var dataContext = new NorthwindEntities();
            if (!string.IsNullOrEmpty(item.Id))
            {
                var id = int.Parse(item.Id);
                var employees = from e in dataContext.Employees
                                where (e.ReportsTo == id)
                                select new
                                {
                                    id = e.EmployeeID,
                                    Name = e.FirstName + " " + e.LastName,
                                    hasChildren = e.Employees.Any()
                                };

                return Json(employees, JsonRequestBehavior.AllowGet);
            }
            else
	        {
                return Json(dataContext.Employees.Where(e => e.ReportsTo == null).Select(e => new
                {
                    id = e.EmployeeID,
                    Name = e.FirstName + " " + e.LastName,
                    hasChildren = e.Employees.Any()
                }), JsonRequestBehavior.AllowGet);
	        }
        }

        public ActionResult About()
        {
            return View();
        }
    }
}
