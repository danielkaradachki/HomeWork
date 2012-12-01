using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Kendo.Mvc.Extensions;
using Kendo.Mvc.UI;
using AjaxHierarchy.Models;
namespace AjaxHierarchy.Controllers
{
    public class HomeController : Controller
    {
        NorthwindEntities context = new NorthwindEntities();
        public ActionResult Index()
        {
            ViewBag.Message = "Welcome to ASP.NET MVC!";

            return View();
        }
        public ActionResult Read_Employees([DataSourceRequest] DataSourceRequest request)
        {
            return Json(context.Employees.ToDataSourceResult(request, e => new
            {
                e.EmployeeID,
                e.FirstName,
                e.LastName,
                e.Title,
                e.Country,
                e.City
            }));
        }

        public ActionResult Read_Orders([DataSourceRequest] DataSourceRequest request, int id)
        {
            return Json(context.Orders.Where(e => e.EmployeeID == id).ToDataSourceResult(request, o => new
            {
                o.OrderID,
                o.ShipAddress,
                o.ShipCity,
                o.ShipCountry,
                o.ShipName,
                o.ShippedDate
            }));
        }

        public ActionResult Read_OrderDetails([DataSourceRequest] DataSourceRequest request, int id)
        {
            return Json(context.Order_Details.Where(o=> o.OrderID == id).ToDataSourceResult(request, o => new
            {
                o.Quantity,
                o.UnitPrice,
                o.Discount,
                Product = new
                {
                    o.Product.ProductName
                }
            }));
        }

        public ActionResult About()
        {
            return View();
        }
    }
}
